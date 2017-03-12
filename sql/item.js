import _ from 'lodash'
import * as sqlGenerator from './index'
import alias from './alias'

const Item_Table_Name='items',Host_Monitored = 0


const sqlSearchItems = (appName,hostList,itemList)=>{
    let joinPart = `inner join hosts on hosts.hostid=items.hostid
        inner join items_applications on items_applications.itemid=items.itemid
        inner join applications on applications.applicationid=items_applications.applicationid
        inner join functions on items.itemid=functions.itemid
        inner join triggers on functions.triggerid=triggers.triggerid`
    let fields = `hosts.name as ${alias.host_name_alias}, items.name as ${alias.item_name_alias}, items.key_ as ${alias.item_key_alias}, items.itemid as ${alias.item_id_alias}, items.value_type as ${alias.item_value_type_alias}, triggers.value as ${alias.trigger_status_alias}, triggers.priority as ${alias.trigger_priority_alias}`
    let wherePart = `hosts.status=${Host_Monitored} and hosts.name not like "Template%"`
    if(appName === 'WinOS'||appName === 'Windows Servers')
        wherePart = wherePart + ` and applications.name="os-rpt" or applications.name="fs-rpt"`
    else
        wherePart = wherePart + ` and applications.name="${appName}"`
    if(hostList){
        hostList = _.map(hostList,(host)=>`"${host}"`).join()
        wherePart = wherePart + ` and hosts.name in (${hostList})`
    }
    if(itemList){
        itemList = _.map(itemList,(item)=>`"${item}"`).join()
        wherePart = wherePart + ` and items.name in (${itemList})`
    }
    let sql = sqlGenerator.sqlFindWithFieldsAndWhere(fields,Item_Table_Name,joinPart,wherePart)
    return sql
}

const sqlGetItem = (itemId)=>{
    let sql = `select items.itemid,value_type as ${alias.item_value_type_alias},units,
              functions.function ${alias.function_function_alias},triggers.expression ${alias.trigger_expression_alias},
              triggers.description ${alias.trigger_description_alias} from items
            left join functions on functions.itemid=items.itemid
            left join triggers on triggers.triggerid=functions.triggerid
            where items.itemid=${itemId}`
    return sql
}


export {sqlSearchItems,sqlGetItem}
