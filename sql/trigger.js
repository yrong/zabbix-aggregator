const sqlGenerator = require('./index')
const alias = require('./alias')

const Trigger_Table_Name='triggers',Status_Problem = 1,Status_Normal = 0,Zabbix_Template_Name_keyword='Templates',Zabbix_Group_Name_Keyword='zabbix',
    InnerJoin_Table_Name = 'triggers_function_items_hosts_groups';
const joinPart = `inner join functions on triggers.triggerid=functions.triggerid
        inner join items on functions.itemid=items.itemid
        inner join hosts on items.hostid=hosts.hostid
        inner join hosts_groups on hosts.hostid=hosts_groups.hostid
        inner join groups on hosts_groups.groupid=groups.groupid`

const wherePartExcludeZabbix = `groups.name not like "%${Zabbix_Group_Name_Keyword}%" and groups.name != "${Zabbix_Template_Name_keyword}"`


const sqlFindTriggers = (config)=>{
    let fields = `hosts.host,triggers.description,priority,lastchange,items.itemid,groups.name as ${alias.group_name_alias}`
    let sql = sqlGenerator.sqlFindWithFieldsAndWhere(fields,Trigger_Table_Name,joinPart,wherePartExcludeZabbix)
    if(config.status)
        sql = `${sql} and triggers.value=${config.status}`
    if(config.since)
        sql = `${sql} and triggers.lastchange>=${config.since}`
    if(config.until)
        sql = `${sql} and triggers.lastchange<=${config.until}`
    if(config.hosts)
        sql = `${sql} and hosts.name in ${config.hosts}`
    if(config.group)
        sql = `${sql} and groups.name="${config.group}"`
    if(config.priority)
        sql = `${sql} and triggers.priority="${config.priority}"`
    return sql
}

const sqlGroupTriggersByGroup = (config)=> {
    let innerSql = sqlFindTriggers(config)
    let sql = `select ${alias.group_name_alias}, ${alias.trigger_priority_alias}, count(*) as ${alias.count_alias}
    from (
         ${innerSql}
        )
    as ${InnerJoin_Table_Name} group by ${alias.group_name_alias}, ${alias.trigger_priority_alias}`
    return sql
}

const sqlCountTriggers = (config)=> {
    let innerSql = sqlFindTriggers(config)
    let sql = `select count(*) as ${alias.count_alias}
    from (
         ${innerSql}
        )
    as ${InnerJoin_Table_Name}`
    return sql
}

module.exports = {sqlGroupTriggersByGroup,sqlCountTriggers,sqlFindTriggers,Status_Problem,Status_Normal}