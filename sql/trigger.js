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
    let fields = `hosts.host,triggers.description,triggers.priority as ${alias.trigger_priority_alias},triggers.value as ${alias.trigger_value_alias},DATE_FORMAT(FROM_UNIXTIME(lastchange),'%Y-%m-%d') as ${alias.trigger_lastchange_date_alias},items.itemid,groups.name as ${alias.group_name_alias}`
    let sql = sqlGenerator.sqlFindWithFieldsAndWhere(fields,Trigger_Table_Name,joinPart,wherePartExcludeZabbix)
    if(config.value)
        sql = `${sql} and triggers.value=${config.value}`
    if(config.since)
        sql = `${sql} and triggers.lastchange>=${config.since}`
    if(config.until)
        sql = `${sql} and triggers.lastchange<=${config.until}`
    if(config.hosts)
        sql = `${sql} and hosts.name in ${config.hosts}`
    if(config[alias.group_name_alias])
        sql = `${sql} and groups.name="${config[alias.group_name_alias]}"`
    if(config.priority)
        sql = `${sql} and triggers.priority="${config.priority}"`
    return sql
}

const sqlGroupTriggers = (filter,groupBy)=> {
    let innerSql = sqlFindTriggers(filter)
    let sql = `select ${groupBy}, count(*) as ${alias.count_alias}
    from (
         ${innerSql}
        )
    as ${InnerJoin_Table_Name} group by ${groupBy}`
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

module.exports = {sqlGroupTriggers,sqlCountTriggers,sqlFindTriggers,Status_Problem,Status_Normal}