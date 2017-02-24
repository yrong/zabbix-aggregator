const Trigger_Table_Name='triggers',Status_Problem = 1,Zabbix_Group_Name_Templates='Templates',Zabbix_Group_Name_Keyword='zabbix',group_name_alias = 'gpname',count_alias = 'cnt'

const joinPart = `inner join functions on triggers.triggerid=functions.triggerid
        inner join items on functions.itemid=items.itemid
        inner join hosts on items.hostid=hosts.hostid
        inner join hosts_groups on hosts.hostid=hosts_groups.hostid
        inner join groups on hosts_groups.groupid=groups.groupid`

const wherePartExcludeZabbix = `groups.name not like "%${Zabbix_Group_Name_Keyword}%" and groups.name != "${Zabbix_Group_Name_Templates}"`


const sqlFindWithFieldsAndWhere = (fields,table,join,where)=> `select ${fields} from ${table}
    ${join}
    where ${where}`


const sqlFindTriggers = (active)=>{
    let fields = `priority,lastchange,functions.itemid,groups.name as ${group_name_alias}`
    let sql = sqlFindWithFieldsAndWhere(fields,Trigger_Table_Name,joinPart,wherePartExcludeZabbix)
    if(active)
        sql = `${sql} and value=${Status_Problem}`
    return sql
}

const sqlFindTriggersActiveInGroup = (group)=>{
    let fields = `hosts.host,triggers.description,items.itemid,groups.name as groupName,priority,lastchange`
    let where_with_active = `${wherePartExcludeZabbix} and value=${Status_Problem}`
    let sql = sqlFindWithFieldsAndWhere(fields,Trigger_Table_Name,joinPart,where_with_active)
    if(group)
        sql = `${sql} and groups.name="${group}"`
    return sql
}

const sqlGroupTriggersActiveByGroupName = ()=> {
    let innerSql = sqlFindTriggers(Status_Problem)
    let sql = `select ${group_name_alias}, priority, count(*) as cnt
    from (
         ${innerSql}
        )
    as triggers_withProblem group by ${group_name_alias}, priority;`
    return sql
}

const sqlCountTriggers = ()=> {
    let innerSql = sqlFindTriggers()
    let sql = `select count(*) as ${count_alias}
    from (
         ${innerSql}
        )
    as triggers_withProblem`
    return sql
}

const sqlFindTriggersWithCondition = (groupName,priority) => {
    let fields = `hosts.host, triggers.description, lastchange, items.itemid`
    let wherePart = `value=${Status_Problem} and groups.name="${groupName}" and priority=${priority}`
    let sql = sqlFindWithFieldsAndWhere(fields,Trigger_Table_Name,joinPart,wherePart)
    return sql
}

export {sqlGroupTriggersActiveByGroupName,sqlCountTriggers,sqlFindTriggersWithCondition,sqlFindTriggersActiveInGroup,group_name_alias,count_alias}