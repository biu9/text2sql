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

npm run dev --eval_path="../data/dev.json" --mode="dev" --use_knowledge="False" --db_root_path="../data/dev_databases/" --data_output_path="../exp_result/turbo_output/" --chain_of_thought="False"
```