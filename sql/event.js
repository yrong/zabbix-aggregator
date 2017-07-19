const alias = require('./alias')
const sqlGenerator = require('./index')
const _ = require('lodash')

const sqlGetTriggerEvents = (params) =>{
    let filter = params.filter||{},pagination = params.pagination,Events_Table_Name='events',fields,joinPart,wherePart,sql
    fields = `events.objectid as triggerid,events.clock,events.value,events.acknowledged,hosts.host,triggers.description,items.itemid,groups.name as ${alias.group_name_alias}`
    joinPart = `inner join triggers on events.objectid=triggers.triggerid 
        inner join functions on triggers.triggerid=functions.triggerid
        inner join items on functions.itemid=items.itemid
        inner join hosts on items.hostid=hosts.hostid
        inner join hosts_groups on hosts.hostid=hosts_groups.hostid
        inner join groups on hosts_groups.groupid=groups.groupid`
    wherePart = `${sqlGenerator.wherePartExcludeZabbixGroup} and events.source=0 and events.object=0`
    if(filter.since)
        wherePart = `${wherePart} and events.clock>=${filter.since}`
    if(filter.until)
        wherePart = `${wherePart} and events.clock<=${filter.until}`
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
    sql = sqlGenerator.sqlFindWithFieldsAndWhere(fields,Events_Table_Name,joinPart,wherePart,pagination)
    return sql
}

module.exports = {sqlGetTriggerEvents}