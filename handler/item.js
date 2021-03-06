'use strict';

const Router = require('koa-router')
const db = require('../lib/db')
const _ = require('lodash')
const alias = require('../sql/alias')
const itemSqlGenerator = require('../sql/item')
const historyValueSqlGenerator = require('../sql/history')
const trendValueSqlGenerator = require('../sql/trends')
const Model = require('redis-crud-fork')
const Redis = require('redis')
const config = require('config')
const TemplateModel = Model(Redis.createClient(_.assign({db:1},config.get('redis'))),'Template')

let items = new Router();
const TriggerThreshholdRegex = /[<>=]{1,2}(\d+)$/
const ItemNameVarSingleRegex = /\$\d/
const ItemNameVarRegex = /\$\d/g
const ItemKeyVarRegex = /\[.*?\]/g

const macroReplace = (items)=>{
    let itemName,itemNameVars,itemKeyVars,itemVarIndex
    items = _.map(items,(item)=>{
        itemName = _.clone(item[alias.item_name_alias])
        itemNameVars = itemName.match(ItemNameVarRegex)
        itemKeyVars = item[alias.item_key_alias].match(ItemKeyVarRegex)
        if(itemNameVars && itemKeyVars){
            itemKeyVars = itemKeyVars[0].substr(1,itemKeyVars[0].length-2).split(',')
            for(let varIndex of itemNameVars){
                itemVarIndex = parseInt(varIndex.substr(1))-1
                itemName = itemName.replace(ItemNameVarSingleRegex,itemKeyVars[itemVarIndex])
            }
            item[alias.item_name_alias] = itemName
        }
        return item
    })
    return items;
}

const orderItemName = (names)=>{
    const isCpuLoadOrMemUsage = (name)=>name.includes('Processor load')||name.includes('Free memory')
    let load_mem = _.filter(names,isCpuLoadOrMemUsage)
    let others = _.reject(names,isCpuLoadOrMemUsage)
    return load_mem.concat(others)
}

const dataWrapper = (items,params)=>{
    items = macroReplace(items)
    let hostNames = _.uniq(_.map(items,(item)=>item[alias.host_name_alias]))
    let itemNames = _.pullAll(_.uniq(_.map(items,(item)=>item[alias.item_name_alias])),[null,undefined])
    itemNames = orderItemName(itemNames)
    let transposed = _.isInteger(params.transposed)?params.transposed:(hostNames.length>=itemNames.length)?0:1
    let metaData = transposed?{rows:itemNames,columns:hostNames}:{rows:hostNames,columns:itemNames}
    let stat = {}
    _.each(items,(item=>{
        // let obj = {id:item[alias.item_id_alias],type:item[alias.item_value_type_alias],triggered:item[alias.trigger_prefix_value_alias]?item[alias.trigger_priority_alias]:0,value:item.value,clock:item.clock,gpname:item.gpname,description:item.description,lastchange:item.lastchange}
        let obj = _.assign({},item)
        let row = item[alias.host_name_alias],col = item[alias.item_name_alias]
        if(transposed)
            [row,col] = [col,row]
        if(row&&col){
            stat[row] = stat[row]?stat[row]:{}
            stat[row][col] = obj
        }
    }))
    return _.assign(metaData,{stat:stat},params)
}

items.post('/search', async(ctx,next)=>{
    let params = _.omit(ctx.request.body,'token')
    if(params.template_id){
        params = _.assign(params,await TemplateModel.get(params.template_id))
    }
    let item_rows = await db.query(itemSqlGenerator.sqlSearchItems(params.appName,params.hosts,params.items,params.groupName))
    for (let item of item_rows){
        let history_value_rows = await db.query(historyValueSqlGenerator.sqlGetLatestItemValueInHistory(item[alias.item_value_type_alias],item[alias.item_id_alias]))
        if(history_value_rows.length){
            item.value = history_value_rows[0].value
            item.clock = history_value_rows[0].clock
        }
    }
    item_rows = dataWrapper(item_rows,params)
    ctx.body=item_rows
})

const getDataTypeDesc = (type)=>{
    let type_description = 'unknown'
    switch (type) {
        case 0:
        case 3:
            type_description = 'digits'
            break
        case 1:
        case 2:
        case 4:
            type_description = 'text'
            break
    }
    return type_description
}

items.get('/history/:itemId', async(ctx,next)=>{
    let params = _.assign({},ctx.params,ctx.query,ctx.request.body),result
    if(!_.isString(params.since)||!_.isString(params.until)){
        ctx.throw("missing params!")
    }
    params.since = parseInt(params.since),params.until = parseInt(params.until)
    let item = await db.query(itemSqlGenerator.sqlGetItem(params.itemId))
    item = item[0]
    let threshhold = item[alias.trigger_expression_alias].match(TriggerThreshholdRegex)
    if(_.isArray(threshhold)){
        item.threshold = parseInt(threshhold[1])
    }
    let timeSpan = await db.query(historyValueSqlGenerator.sqlGetItemTimeSpan(item[alias.item_value_type_alias],params.itemId))
    if(params.since>= timeSpan[0][alias.history_clock_min_alias]){
        result = await db.query(historyValueSqlGenerator.sqlGetValuesWithinTimeRange(item[alias.item_value_type_alias],params.itemId,params.since,params.until))
    }else{
        result = await db.query(trendValueSqlGenerator.sqlGetValuesWithinTimeRange(item[alias.item_value_type_alias],params.itemId,params.since,params.until))
    }
    item.type = getDataTypeDesc(item[alias.item_value_type_alias])
    item = _.omit(item,[alias.item_id_alias,alias.item_value_type_alias,alias.trigger_expression_alias])
    result = _.map(result,(rec)=>{
        return [rec[alias.history_clock_alias],rec[alias.history_value_alias]]
    })
    ctx.body=_.assign(item,{data:result})
})

items.get('/host', async(ctx,next)=>{
    let params = _.assign({},ctx.params,ctx.query,ctx.request.body)
    if(!_.isString(params.name)){
        ctx.throw("missing param!")
    }
    let sql = `select hosts.hostid,items.itemid,items.name from hosts inner join items on hosts.hostid=items.hostid where hosts.name="${params.name}";`
    let items = await db.query(sql)
    ctx.body= items
})

module.exports = items
