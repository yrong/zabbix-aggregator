import _ from 'lodash'
import * as sqlGenerator from './index'

const Item_Table_Name='items',Host_Monitored = 0,hostName_alias = 'host_name',itemName_alias = 'item_name',itemKey_alias = 'item_key',triggerStatus_alias = 'trigger_status'

const joinPart = `inner join hosts on hosts.hostid=items.hostid
        inner join items_applications on items_applications.itemid=items.itemid
        inner join applications on applications.applicationid=items_applications.applicationid
        inner join functions on items.itemid=functions.itemid
        inner join triggers on functions.triggerid=triggers.triggerid`


const sqlSearchItems = (appName,hostList,itemList)=>{
    let fields = `hosts.name as ${hostName_alias}, items.name as ${itemName_alias}, items.key_ as ${itemKey_alias}, items.itemid, items.value_type, triggers.value as ${triggerStatus_alias}, triggers.priority`
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
