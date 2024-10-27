import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import sqlite3 from 'sqlite3';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { ArgumentParser } from 'argparse';

interface ExecResult {
  sql_idx: number;
  time_ratio: number;
}

let execResult: ExecResult[] = [];

function cleanAbnormal(input: number[]): number[] {
  const mean = input.reduce((a, b) => a + b) / input.length;
  const std = Math.sqrt(input.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / input.length);

  return input.filter(x => x < mean + 3 * std && x > mean - 3 * std);
}

function executeSQL(sql: string, dbPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    const startTime = Date.now();
    db.run(sql, (err) => {
      if (err) return reject(err);
      resolve((Date.now() - startTime) / 1000); // exec time in seconds
    });
    db.close();
  });
}

async function iteratedExecuteSQL(predictedSQL: string, groundTruth: string, dbPath: string, iterateNum: number): Promise<number> {
  const db = new sqlite3.Database(dbPath);
  const diffList: number[] = [];

  const predictedRes = await new Promise((resolve, reject) => {
    db.all(predictedSQL, (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
  const groundTruthRes = await new Promise((resolve, reject) => {
    db.all(groundTruth, (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });

  if (JSON.stringify(predictedRes) === JSON.stringify(groundTruthRes)) {
    for (let i = 0; i < iterateNum; i++) {
      const predictedTime = await executeSQL(predictedSQL, dbPath);
      const groundTruthTime = await executeSQL(groundTruth, dbPath);
      diffList.push(groundTruthTime / predictedTime);
    }
  }
  db.close();
  const processedDiffList = cleanAbnormal(diffList);
  return processedDiffList.reduce((a, b) => a + b) / processedDiffList.length;
}

async function getSqlRes(sql: string, dbPath: string): Promise<any[]> {
  const db = new sqlite3.Database(dbPath);
  return new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
}

function packageSQLs(sqlPath: string, dbRootPath: string, mode: string = 'gpt', dataMode: string = 'dev'): [string[], string[]] {
  const cleanSQLs: string[] = [];
  const dbPathList: string[] = [];

  if (mode === 'gpt') {
    const sqlData = JSON.parse(fs.readFileSync(path.join(sqlPath, `predict_${dataMode}.json`), 'utf-8'));
    Object.entries(sqlData).forEach(([idx, sqlStr]) => {
      const [sql, dbName] = typeof sqlStr === 'string' ? sqlStr.split('\t----- bird -----\t') : [" ", "financial"];
      cleanSQLs.push(sql);
      dbPathList.push(path.join(dbRootPath, dbName, `${dbName}.sqlite`));
    });
  } else {
    const sqls = fs.readFileSync(path.join(sqlPath, `${dataMode}_gold.sql`), 'utf-8').split('\n');
    sqls.forEach(sqlStr => {
      const [sql, dbName] = sqlStr.trim().split('\t');
      cleanSQLs.push(sql);
      dbPathList.push(path.join(dbRootPath, dbName, `${dbName}.sqlite`));
    });
  }
  return [cleanSQLs, dbPathList];
}

function computeVES(execResults: ExecResult[]): number {
  const numQueries = execResults.length;
  const totalRatio = execResults.reduce((acc, result) => acc + Math.sqrt(result.time_ratio) * 100, 0);
  return totalRatio / numQueries;
}

function printData(scoreLists: number[], countLists: number[]) {
  const levels = ['simple', 'moderate', 'challenging', 'total'];
  console.log(`${"".padEnd(20)} ${levels.join(" ".repeat(20))}`);
  console.log(`${'count'.padEnd(20)} ${countLists.join(" ".repeat(20))}`);
  console.log('=========================================    VES   ========================================');
  console.log(`${'ves'.padEnd(20)} ${scoreLists.map(s => s.toFixed(2)).join(" ".repeat(20))}`);
}

if (isMainThread) {
  const parser = new ArgumentParser();
  parser.add_argument('--predicted_sql_path', { type: 'str', required: true });
  parser.add_argument('--ground_truth_path', { type: 'str', required: true });
  parser.add_argument('--data_mode', { type: 'str', default: 'dev' });
  parser.add_argument('--db_root_path', { type: 'str', required: true });
  parser.add_argument('--num_cpus', { type: 'int', default: 1 });
  parser.add_argument('--meta_time_out', { type: 'float', default: 30.0 });
  parser.add_argument('--diff_json_path', { type: 'str', required: true });

  const args = parser.parse_args();

  const [predQueries, dbPaths] = packageSQLs(args.predicted_sql_path, args.db_root_path, 'gpt', args.data_mode);

  // for (let i = 0; i < predQueries.length; i++) {
  //   console.log('predQueries[i]:', predQueries[i]);
  //   getSqlRes(predQueries[i], dbPaths[i]).then((res) => {
  //     console.log('res:', res);
  //   })
  // }

  getSqlRes(predQueries[1].split('\t')[0], dbPaths[1]).then((res) => {
    console.log('res:', res);
  })

  // const [gtQueries] = packageSQLs(args.ground_truth_path, args.db_root_path, 'gt', args.data_mode);
  // const queryPairs = predQueries.map((predSQL, idx) => [predSQL, gtQueries[idx]]);

  // queryPairs.forEach(([predSQL, gtSQL], idx) => {
  //   new Worker(__filename, {
  //     workerData: {
  //       predictedSQL: predSQL,
  //       groundTruth: gtSQL,
  //       dbPath: dbPaths[idx],
  //       idx: idx,
  //       iterateNum: 100,
  //       metaTimeOut: args.meta_time_out
  //     }
  //   }).on('message', (result: ExecResult) => execResult.push(result));
  // });
}
