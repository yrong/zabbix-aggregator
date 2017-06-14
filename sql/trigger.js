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


const sqlFindTriggers = (status,since,until,hosts)=>{
    let fields = `priority,lastchange,functions.itemid,groups.name as ${alias.group_name_alias}`
    let sql = sqlGenerator.sqlFindWithFieldsAndWhere(fields,Trigger_Table_Name,joinPart,wherePartExcludeZabbix)
    if(status)
        sql = `${sql} and triggers.value=${status}`
    if(since)
        sql = `${sql} and triggers.lastchange>=${since}`
    if(until)
        sql = `${sql} and triggers.lastchange<=${until}`
    if(hosts)
        sql = `${sql} and hosts.name in ${hosts}`
    return sql
}

const sqlFindTriggersInGroup = (group,status)=>{
    let fields = `hosts.host,triggers.description,items.itemid,groups.name as groupName,priority,lastchange`
    let where_with_status = `${wherePartExcludeZabbix} and value=${status}`
    let sql = sqlGenerator.sqlFindWithFieldsAndWhere(fields,Trigger_Table_Name,joinPart,where_with_status)
    if(group)
        sql = `${sql} and groups.name="${group}"`
    return sql
}

const sqlGroupTriggersByGroupName = (status)=> {
    let innerSql = sqlFindTriggers(status)
    let sql = `select ${alias.group_name_alias}, ${alias.trigger_priority_alias}, count(*) as ${alias.count_alias}
    from (
         ${innerSql}
        )
    as ${InnerJoin_Table_Name} group by ${alias.group_name_alias}, ${alias.trigger_priority_alias}`
    return sql
}

const sqlCountTriggers = (status,since,until,hosts)=> {
    let innerSql = sqlFindTriggers(status,since,until,hosts)
    let sql = `select count(*) as ${alias.count_alias}
    from (
         ${innerSql}
        )
    as ${InnerJoin_Table_Name}`
    return sql
}

const sqlFindTriggersWithCondition = (groupName,priority,status) => {
    let fields = `hosts.host, triggers.description, lastchange, items.itemid`
    let wherePart = `value=${status} and groups.name="${groupName}" and priority=${priority}`
    let sql = sqlGenerator.sqlFindWithFieldsAndWhere(fields,Trigger_Table_Name,joinPart,wherePart)
    return sql
}

module.exports = {sqlGroupTriggersByGroupName,sqlCountTriggers,sqlFindTriggersWithCondition,sqlFindTriggersInGroup,Status_Problem,Status_Normal}