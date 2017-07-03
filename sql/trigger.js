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


const sqlFindTriggers = (filter)=>{
    let fields = `hosts.host,triggers.description,triggers.priority as ${alias.trigger_priority_alias},triggers.value as ${alias.trigger_value_alias},DATE_FORMAT(FROM_UNIXTIME(lastchange),'%Y-%m-%d') as ${alias.trigger_lastchange_date_alias},items.itemid,groups.name as ${alias.group_name_alias}`
    let sql = sqlGenerator.sqlFindWithFieldsAndWhere(fields,Trigger_Table_Name,joinPart,wherePartExcludeZabbix)
    if(filter.value)
        sql = `${sql} and triggers.value=${filter.value}`
    if(filter.since)
        sql = `${sql} and triggers.lastchange>=${filter.since}`
    if(filter.until)
        sql = `${sql} and triggers.lastchange<=${filter.until}`
    if(filter.hosts)
        sql = `${sql} and hosts.name in ${filter.hosts}`
    if(filter[alias.group_name_alias])
        sql = `${sql} and groups.name="${filter[alias.group_name_alias]}"`
    if(filter.priority)
        sql = `${sql} and triggers.priority="${filter.priority}"`
    return sql
}

const sqlCountTriggersByGroup = (filter,groupBy)=> {
    let innerSql = sqlFindTriggers(filter),sql
    if(groupBy){
        sql = `select count(*) as ${alias.count_alias},${groupBy}
            from (
                 ${innerSql}
                )
            as ${InnerJoin_Table_Name} group by ${groupBy}`
    }else{
        sql = `select count(*) as ${alias.count_alias}
            from (
                 ${innerSql}
                )
            as ${InnerJoin_Table_Name}`
    }
    return sql
}

module.exports = {sqlCountTriggersByGroup,sqlFindTriggers,Status_Problem,Status_Normal}