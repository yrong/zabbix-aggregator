#! /bin/bash
echo $'mysql schema'
mysql -h127.0.0.1 -uroot -proot zabbix < script/schema.sql
echo $'delete index'
curl -XDELETE 'http://localhost:9200/triggers_statistic/'
echo $'\n\ncreate index and add schema'
curl --header "Content-Type: application/json" -XPUT 'http://localhost:9200/triggers_statistic/' -d @./script/mapping.json