const sqlGenerator = require('./index')
const alias = require('./alias')
const _ = require('lodash')

const Trigger_Table_Name='triggers',Status_Problem = 1,Status_Normal = 0,Zabbix_Template_Name_keyword='Templates',Zabbix_Group_Name_Keyword='zabbix',
    InnerJoin_Table_Name = 'triggers_function_items_hosts_groups';
const joinPart = `inner join functions on triggers.triggerid=functions.triggerid
        inner join items on functions.itemid=items.itemid
        inner join hosts on items.hostid=hosts.hostid
        inner join hosts_groups on hosts.hostid=hosts_groups.hostid
        inner join groups on hosts_groups.groupid=groups.groupid`

const wherePartExcludeZabbix = `groups.name not like "%${Zabbix_Group_Name_Keyword}%" and groups.name != "${Zabbix_Template_Name_keyword}"`


const sqlFindTriggers = (filter,pagination)=>{
    let date_format="'%Y%m%d'",until,sql,field_timespan,wherePart,
        fields = `hosts.host,triggers.description,triggers.priority as ${alias.trigger_priority_alias},triggers.value as ${alias.trigger_value_alias},items.itemid,groups.name as ${alias.group_name_alias}`
    if(filter.time_unit === 'months')
        date_format = "'%Y%m'"
    else if(filter.time_unit === 'years')
        date_format = "'%Y'"
    until = filter.until?`FROM_UNIXTIME(${filter.until})`:`CURDATE()`
    field_timespan = `FLOOR(PERIOD_DIFF(DATE_FORMAT(${until}, ${date_format}), DATE_FORMAT(FROM_UNIXTIME(lastchange), ${date_format})) / ${filter.granularity}) as ${alias.trigger_lastchange_timespan_alias}`
    if(filter.time_unit&&filter.granularity)
        fields = `${fields},${field_timespan}`
    wherePart = sqlGenerator.wherePartExcludeZabbixGroup
    if(filter.value)
        wherePart = `${wherePart} and triggers.value=${filter.value}`
    if(filter.since)
        wherePart = `${wherePart} and triggers.lastchange>=${filter.since}`
    if(filter.until)
        wherePart = `${wherePart} and triggers.lastchange<=${filter.until}`
    if(filter.host){
        if(_.isArray(filter.host)&&filter.host.length){
            filter.host = _.map(filter.host,(host)=>'"' + host + '"')
            wherePart = `${wherePart} and hosts.host in (${filter.host.join()})`
        }else if(_.isString(filter.host)){
            wherePart = `${wherePart} and hosts.host like '${filter.host.replace(/\*/g,'%')}'`
        }
    }
    if(filter[alias.group_name_alias])
        wherePart = `${wherePart} and groups.name="${filter[alias.group_name_alias]}"`
    if(filter.priority)
        wherePart = `${wherePart} and triggers.priority="${filter.priority}"`
    sql = sqlGenerator.sqlFindWithFieldsAndWhere(fields,Trigger_Table_Name,joinPart,wherePart,pagination)
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