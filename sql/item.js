import _ from 'lodash'
import * as sqlGenerator from './index'
import alias from './itemAlias'

const Item_Table_Name='items',Host_Monitored = 0

const joinPart = `inner join hosts on hosts.hostid=items.hostid
        inner join items_applications on items_applications.itemid=items.itemid
        inner join applications on applications.applicationid=items_applications.applicationid
        inner join functions on items.itemid=functions.itemid
        inner join triggers on functions.triggerid=triggers.triggerid`


const sqlSearchItems = (appName,hostList,itemList)=>{
    let fields = `hosts.name as ${alias.hostName_alias}, items.name as ${alias.itemName_alias}, items.key_ as ${alias.itemKey_alias}, items.itemid as ${alias.itemId_alias}, items.value_type as ${alias.itemValueType_alias}, triggers.value as ${alias.triggerStatus_alias}, triggers.priority as ${alias.triggerPriority_alias}`
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


export {sqlSearchItems}
