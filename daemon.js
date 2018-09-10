const _ = require('lodash')
const db = require('./lib/db')
const search = require('scirichon-search')
const config = require('config')
const triggers_statistic_index_name = triggers_statistic_tbl_name = config.get('scmpz.statistic_tbl_name')

const gather = async ()=>{
    let sql = `select hosts.hostid,hosts.host as hostname,groups.groupid,groups.name as groupname,items.itemid,items.name as itemname,triggers.triggerid,triggers.value as triggervalue,triggers.priority as triggerpriority,lastchange,UNIX_TIMESTAMP() as writtentime 
            from items left join functions on functions.itemid=items.itemid
            left join triggers on triggers.triggerid=functions.triggerid
            left join hosts on items.hostid=hosts.hostid
            left join hosts_groups on hosts.hostid=hosts_groups.hostid
            left join groups on hosts_groups.groupid=groups.groupid
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
    let sql = `drop table \`${triggers_statistic_tbl_name}\``
    try{
        await db.query(sql)
    }catch(err){
        //ignore
    }
    sql = `create table \`${triggers_statistic_tbl_name}\` (
               \`hostid\` bigint unsigned NOT NULL,
                \`hostname\` varchar(255),
               \`groupid\`  bigint unsigned NOT NULL,
               \`groupname\` varchar(255),
               \`itemid\` bigint unsigned  NOT NULL,
               \`itemname\` varchar(255),
               \`triggerid\`   bigint unsigned,
               \`triggervalue\`   integer,
               \`triggerpriority\`   integer,
               \`lastchange\`       integer,
               \`writtentime\`       integer
            );`
    await db.query(sql)
    const mappings =
        {
            "mappings": {
                "doc": {
                    "properties": {
                        "groupname": {
                            "type": "keyword"
                        },
                        "hostname": {
                            "type": "keyword"
                        },
                        "itemname": {
                            "type": "keyword"
                        },
                        "lastchange": {
                            "type": "date",
                            "format": "epoch_second||epoch_millis"
                        },
                        "writtentime": {
                            "type": "date",
                            "format": "epoch_second||epoch_millis"
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