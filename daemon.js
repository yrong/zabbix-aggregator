const _ = require('lodash')
const db = require('./lib/db')
const search = require('scirichon-search')
const config = require('config')
const triggers_statistic_index_name = triggers_statistic_tbl_name = config.get('scmpz.statistic_tbl_name')

const gather = async ()=>{
    let sql = `select hosts.hostid,groups.groupid,items.itemid,triggers.triggerid,triggers.value as triggervalue,
            triggers.priority as triggerpriority,lastchange,UNIX_TIMESTAMP() as writtentime 
            from triggers inner join functions on triggers.triggerid=functions.triggerid
            inner join items on functions.itemid=items.itemid
            inner join hosts on items.hostid=hosts.hostid
            inner join hosts_groups on hosts.hostid=hosts_groups.hostid
            inner join groups on hosts_groups.groupid=groups.groupid
            where groups.name not like "%zabbix%" and groups.name != "Templates"`
    let results = await db.query(sql)
    await search.batchCreate(triggers_statistic_index_name,results,true)
    console.log('add to es')
    results = _.map(results,(result)=>_.values(result))
    sql = `insert into ${triggers_statistic_tbl_name} values ?`
    await db.query(sql,results,true)
    console.log('add to mysql')
}

const initialize = async ()=>{
    const sql = `create table if not exists \`${triggers_statistic_tbl_name}\` (
               \`hostid\` bigint unsigned,
               \`groupid\`  bigint unsigned NOT NULL,
               \`itemid\` bigint unsigned  NOT NULL,
               \`triggerid\`   bigint unsigned   NOT NULL,
               \`triggervalue\`   integer    DEFAULT '0'  NOT NULL,
               \`triggerpriority\`   integer   DEFAULT '0'  NOT NULL,
               \`lastchange\`       integer    DEFAULT '0'  NOT NULL,
               \`writtentime\`       integer    DEFAULT '0'  NOT NULL
            ); `
    await db.query(sql)
    const mappings =
    {
          "mappings": {
            "doc": {
              "properties": {
                "lastchange": {
                  "type": "date",
                  "format": "epoch_second"
                },
                "writtentime": {
                  "type": "date",
                  "format": "epoch_second"
                }
              }
            }
          }
    }
    let init_es = new Promise((resolve,reject)=>{
        db.esClient.indices.delete({index:[triggers_statistic_index_name]},(err)=>{
            if(err){
                resolve()
            }
            db.esClient.indices.create({
                index: triggers_statistic_index_name,
                body: mappings
            }, (err) => {
                if (err) {
                    reject(err)
                }
                console.log(`es index ${triggers_statistic_index_name} created`)
                resolve()
            })
        })
    })
    await Promise.resolve(init_es)
}

if (require.main === module) {
    if(parseInt(process.env['INIT'])){
        initialize().then((err,result)=>{
            console.log('schema init finished')
            process.exit()
        }).catch((err)=>{
            console.log(err.stack||err)
        })
    }else{
        gather().then(()=>{
            console.log('data gather finished')
            process.exit()
        }).catch((err)=>{
            console.log(err.stack||err)
        })
    }
}