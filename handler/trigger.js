'use strict';

const Router = require('koa-router')
const _ = require('lodash')
const db = require('../lib/db')
const triggerSqlGenerator = require('../sql/trigger')
const alias = require('../sql/alias')
const config = require('config')
const groupList = ["Network","Windows Servers","Linux servers","Virtual machines","Exchange Servers","Out of Band","ESX","Storage","TSM Backup Jobs"]
const priorityList=["Information","Warning","Average","High","Disaster"]
const HostsNotExist = `("NOTEXIST")`
const moment = require('moment')
const common = require('scirichon-common')
const cmdb_api_url = `http://${config.get('privateIP')||'localhost'}:${config.get('cmdb.port')}`

const categories_by_value = ['value'],categories_by_itservice_value = ['itservice','value'].sort(),
    categories_by_hostgroup_priority = ['gpname','priority'].sort(),categories_by_lastchange_value =['lastchange','value'].sort()

let triggers = new Router();

const buildHostFilter = async (filter)=>{
    let hosts,results,cmdb_base_url=`http://${config.get('privateIP')||'localhost'}:${config.get('cmdb.port')}`;
    if(_.isArray(filter.itservice)&&filter.itservice.length){
        results = await common.apiInvoker('POST',cmdb_base_url,'/api/searchByCypher',{category:"ConfigurationItem",cypherQueryFile:'queryHostsByITService',uuid:filter.itservice})
        results = results.data||results
        filter.host = HostsNotExist
    }
    if(results&&results.length){
        hosts = _.map(results,(result)=>result.name)
        filter = filter || {}
        filter.host = hosts
    }
    return filter
}

const countByHostGroupAndPriority = async (filter,groupBy)=>{
    filter = await buildHostFilter(filter)
    groupBy = [alias.group_name_alias,alias.trigger_priority_alias].join()
    let stat = {},all;
    let groups = await db.query(triggerSqlGenerator.sqlCountTriggersByGroup(filter,groupBy))
    let rows = await db.query(triggerSqlGenerator.sqlCountTriggersByGroup(filter))
    all = rows[0][alias.count_alias]
    for(let group of groups){
        filter[alias.group_name_alias]  = group[alias.group_name_alias], filter[alias.trigger_priority_alias] = group[alias.trigger_priority_alias]
        rows = await db.query(triggerSqlGenerator.sqlFindTriggers(filter))
        stat[filter[alias.group_name_alias]] = stat[filter[alias.group_name_alias]]||{}
        stat[filter[alias.group_name_alias]][filter[alias.trigger_priority_alias]] = rows
    }
    return {all,groupList,priorityList,stat}
}

const countByLastChangeAndValue = async (filter,groupBy)=>{
    filter = await buildHostFilter(filter)
    let time_unit = groupBy.time_unit || 'day',granularity = groupBy.granularity || 1,latest = groupBy.latest,interval,format,date
    filter.time_unit = time_unit ==='year'?'years':time_unit === 'month'?'months':'days'
    format = time_unit ==='year'?'YYYY':time_unit === 'month'?'YYYY-MM':'YYYY-MM-DD'
    filter.granularity = granularity
    if(latest){
        filter.since = moment().subtract(latest*granularity, filter.time_unit).unix()
        filter.until = moment().unix()
    }
    groupBy = [alias.trigger_lastchange_timespan_alias,alias.trigger_value_alias].join()
    let result = {}
    let groups = await db.query(triggerSqlGenerator.sqlCountTriggersByGroup(filter,groupBy))
    for(let group of groups){
        interval = group[alias.trigger_lastchange_timespan_alias]
        date = moment.unix(filter.until).subtract((interval)*granularity,filter.time_unit).format(format)
        result[date] = result[date]||{}
        result[date][group[alias.trigger_value_alias]] = group[alias.count_alias]
    }
    return result
}
const countTriggerByValue = async (filter)=>{
    let groupBy = [alias.trigger_value_alias].join(),results,result={}
    results = await db.query(triggerSqlGenerator.sqlCountTriggersByGroup(filter,groupBy))
    for(let entry of results){
        result[entry[alias.trigger_value_alias]] = entry[alias.count_alias]
    }
    return result
}

const countTriggerByITServiceGroup = async (filter)=>{
    let results = await common.apiInvoker('GET',cmdb_api_url,'/api/it_services/group'),result={}
    results = results.data||results
    for(let group of results){
        filter.itservice = [group.uuid]
        filter = await buildHostFilter(filter)
        result[group.name] = await countTriggerByValue(filter)
    }
    return result
}

const countTriggerByITService = async (filter)=>{
    let results = await common.apiInvoker('GET',cmdb_api_url,'/api/it_services/group'),result={}
    results = results.data||results
    filter = _.omit(filter,['host','itservicegroup'])
    for(let group of results){
        for(let service of group.members){
            result[group.name] = result[group.name] || {}
            filter.itservice = [service.uuid]
            filter = await buildHostFilter(filter)
            result[group.name][service.name] = await countTriggerByValue(filter)
        }
    }
    return result
}

triggers.post('/count', async (ctx)=>{
    let groupBy = ctx.request.body.groupBy,filter = ctx.request.body.filter||{},result,result_depth,category_list
    result = await countTriggerByValue(filter)
    if(!groupBy||!groupBy.category||!groupBy.category.length)
        throw new Error('count missing groupBy field!')
    category_list = groupBy.category.sort()
    if(_.isEqual(category_list,categories_by_value)){
    }else if(_.isEqual(category_list,categories_by_hostgroup_priority)){
        result = await countByHostGroupAndPriority(filter,groupBy)
    }else if(_.isEqual(category_list,categories_by_lastchange_value)){
        if(groupBy.time_unit&&(groupBy.time_unit!=='year'&&groupBy.time_unit!=='month')&&groupBy.time_unit!=='day')
            throw new Error('groupBy time_unit unknown,only year|month|day support')
        if(groupBy.granularity&&!(_.isInteger(groupBy.granularity)))
            throw new Error('groupBy granularity should be integer')
        if(groupBy.latest&&!(_.isInteger(groupBy.latest)))
            throw new Error('groupBy latest should be integer')
        result = await countByLastChangeAndValue(filter,groupBy)
    }else if(_.isEqual(category_list,categories_by_itservice_value)){
        result_depth = await countTriggerByITServiceGroup(filter)
        if(groupBy.depth === 0){
        }
        else if(groupBy.depth === 1){
            result_depth = _.assign(result_depth,await countTriggerByITService(filter))
        }else{
            throw new Error('depth only support 0|1')
        }
        result = _.assign(result,result_depth)
    }else{
        throw new Error('groupBy category unknown!')
    }
    ctx.body = result
})

const activeTriggerHandler = async(ctx)=>{
    let params = _.assign({},ctx.params,ctx.query,ctx.request.body),filter = await buildHostFilter(ctx.request.body.filter)
    let rows = await db.query(triggerSqlGenerator.sqlFindTriggers(filter,params.pagination))
    ctx.body=rows
}

triggers.post('/search', activeTriggerHandler)



module.exports = triggers