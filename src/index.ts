import fs from 'fs/promises';
import path from 'path';
import { ArgumentParser } from 'argparse';
import { SQLGenerator } from './SQLGenerator';
import { CommandLineArgs, EvalData } from './types';

async function main(): Promise<void> {
  const parser = new ArgumentParser({
    description: 'SQL Generation Tool'
  });

  parser.add_argument('--eval_path', { type: String, default: '' });
  parser.add_argument('--mode', { type: String, default: 'dev' });
  parser.add_argument('--use_knowledge', { type: String, default: 'False' });
  parser.add_argument('--db_root_path', { type: String, default: '' });
  parser.add_argument('--engine', { type: String, default: 'code-davinci-002' });
  parser.add_argument('--data_output_path', { type: String });
  parser.add_argument('--chain_of_thought', { type: String });

  const args = parser.parse_args() as CommandLineArgs;

  const generator = new SQLGenerator({
    engine: args.engine
  });

  const evalDataRaw = await fs.readFile(args.eval_path, 'utf-8');
  const evalData = JSON.parse(evalDataRaw) as EvalData[];

  const questionList = evalData.map(d => d.question);
  const dbPathList = evalData.map(d =>
    path.join(args.db_root_path, d.db_id, `${d.db_id}.sqlite`));
  const knowledgeList = evalData.map(d => d.evidence).filter((evidence): evidence is string => evidence !== undefined);

  const responses = await generator.collectResponseFromGPT(
    dbPathList,
    questionList,
    args.use_knowledge === 'True' ? (knowledgeList.length > 0 ? knowledgeList : null) : null
  );

  const outputName = path.join(
    args.data_output_path,
    `predict_${args.mode}${args.chain_of_thought === 'True' ? '_cot' : ''}.json`
  );

  await generator.generateSqlFile(responses, outputName);

  console.log(`Successfully collected results from ${args.engine} for ${args.mode} evaluation; ` +
    `Use knowledge: ${args.use_knowledge}; Use COT: ${args.chain_of_thought}`);
}

if (require.main === module) {
  main().catch(console.error);
}