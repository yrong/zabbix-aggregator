'use strict';

import Router from 'koa-router';
import db from '../lib/db'
import * as itemSqlGenerator from '../sql/item'
import * as historyValueSqlGenerator from '../sql/history'
import _ from 'lodash'
import alias from '../sql/itemAlias'

let items = new Router();
const DiskSpaceUsageItem = 'Free disk space on $1 (percentage)'
const DiskSpaceUsageRegex = /^vfs.fs.size\[(.*?):,pfree\]$/

const macroReplace = (items)=>{
    items = _.map(items,(item)=>{
        if(item[alias.itemName_alias] === DiskSpaceUsageItem){
            let matched = item[alias.itemKey_alias].match(DiskSpaceUsageRegex)
            if(matched && matched[1])
                item[alias.itemName_alias] = matched[1]
            else
                item[alias.itemName_alias] = undefined
        }
        return item
    })
    return items;
}

const dataWrapper = (items,transposed,title)=>{
    items = macroReplace(items)
    let hostNames = _.uniq(_.map(items,(item)=>item[alias.hostName_alias]))
    let itemNames = _.pullAll(_.uniq(_.map(items,(item)=>item[alias.itemName_alias])),[null,undefined])
    transposed = _.isInteger(transposed)?transposed:(hostNames.length>=itemNames.length)?0:1
    let metaData = transposed?{rows:itemNames,columns:hostNames,transposed}:{rows:hostNames,columns:itemNames,transposed}
    let stat = {}
    _.each(items,(item=>{
        let obj = {id:item[alias.itemId_alias],type:item[alias.itemValueType_alias],triggered:item[alias.triggerStatus_alias]?item[alias.triggerPriority_alias]:0,value:item.value}
        let row = item[alias.hostName_alias],col = item[alias.itemName_alias]
        if(transposed)
            [row,col] = [col,row]
        if(row&&col){
            stat[row] = stat[row]?stat[row]:{}
            stat[row][col] = obj
        }
    }))
    return [_.assign(metaData,{stat:stat,title:title})]
}

items.post('/search', async(ctx,next)=>{
    let params = ctx.request.body
    let [item_rows] = await db.query(itemSqlGenerator.sqlSearchItems(params.appName,params.hosts,params.items))
    for (let item of item_rows){
        let [history_value_rows] = await db.query(historyValueSqlGenerator.sqlGetLatestItemValueInHistory(item[alias.itemValueType_alias],item[alias.itemId_alias]))
        if(history_value_rows.length)
            item.value = history_value_rows[0].value
    }
    item_rows = dataWrapper(item_rows,params.transposed,_.isString(params.title)?params.title:params.appName)
    ctx.body={status:'ok',data:item_rows}
})

export default items