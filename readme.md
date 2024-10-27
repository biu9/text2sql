# text to sql

## usage

```shell
eval_path='./data/dev.json'
dev_path='./output/'
db_root_path='./data/dev_databases/'
use_knowledge='True'
not_use_knowledge='False'
mode='dev' # choose dev or dev
cot='True'
no_cot='Fales'

engine='deepseek-chat'

node dist/index.js --eval_path="./data/dev.json" --mode="dev" --use_knowledge="False" --db_root_path="./data/dev_databases/" --data_output_path="./exp_result/turbo_output/" --chain_of_thought="False" --engine="deepseek-chat"
```

evaluation

```shell
db_root_path='./data/dev_databases/'
data_mode='dev'
predicted_sql_path_kg='./exp_result/turbo_output_kg/'
predicted_sql_path='./exp_result/turbo_output/'
ground_truth_path='./data/'
num_cpus=16
time_out=60
mode_gt='gt'
mode_predict='gpt'
diff_json_path='./data/dev.json'

node dist/evaluation_ves.js --db_root_path="./data/dev_databases/" --data_mode="dev" --predicted_sql_path="./exp_result/turbo_output/" --ground_truth_path="./data/" --num_cpus=16 --diff_json_path="./data/dev.json"
```