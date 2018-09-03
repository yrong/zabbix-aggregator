const _ = require('lodash')
const sqlGenerator = require('./index')
const alias = require('./alias')

const Item_Table_Name='items',Host_Monitored = 0


const sqlSearchItems = (appName,hostList,itemList,groupName)=>{
    let joinPart = `inner join hosts on hosts.hostid=items.hostid
        inner join hosts_groups on hosts_groups.hostid=hosts.hostid
        inner join groups on groups.groupid=hosts_groups.groupid
        inner join items_applications on items_applications.itemid=items.itemid
        inner join applications on applications.applicationid=items_applications.applicationid
        inner join functions on items.itemid=functions.itemid
        inner join triggers on functions.triggerid=triggers.triggerid`
    let fields = `hosts.name as ${alias.host_name_alias}, items.name as ${alias.item_name_alias}, items.key_ as ${alias.item_key_alias}, 
    items.itemid as ${alias.item_id_alias}, items.value_type as ${alias.item_value_type_alias}, 
    triggers.value as ${alias.trigger_prefix_value_alias}, triggers.priority as ${alias.trigger_priority_alias}`
    let wherePart = `hosts.status=${Host_Monitored} and hosts.name not like "Template%"`
    if(appName === 'WinOS'||appName === 'Windows Servers')
        wherePart = wherePart + ` and applications.name="os-rpt" or applications.name="fs-rpt"`
    else if(appName)
        wherePart = wherePart + ` and applications.name="${appName}"`
    if(hostList){
        hostList = _.map(hostList,(host)=>`"${host}"`).join()
        wherePart = wherePart + ` and hosts.name in (${hostList})`
    }
    if(itemList){
        itemList = _.map(itemList,(item)=>`"${item}"`).join()
        wherePart = wherePart + ` and items.name in (${itemList})`
    }
    if(groupName)
        wherePart = wherePart + ` and groups.name="${groupName}"`
    let sql = sqlGenerator.sqlFindWithFieldsAndWhere(fields,Item_Table_Name,joinPart,wherePart)
    return sql
}

const sqlGetItem = (itemId)=>{
    let sql = `select items.itemid,value_type as ${alias.item_value_type_alias},units as ${alias.item_units_alias},
              functions.function ${alias.function_function_alias},triggers.expression ${alias.trigger_expression_alias},
              triggers.description ${alias.trigger_description_alias} from items
            left join functions on functions.itemid=items.itemid
            left join triggers on triggers.triggerid=functions.triggerid
            where items.itemid=${itemId}`
    return sql
}

const sqlGetItemFromItemKeyandHostName = (key,host)=>{
    let sql = `select items.itemid,value_type as ${alias.item_value_type_alias} from items
    inner join hosts on hosts.hostid=items.hostid where items.key_="${key}" and hosts.host="${host}"`
    return sql
}


module.exports = {sqlSearchItems,sqlGetItem,sqlGetItemFromItemKeyandHostName}
