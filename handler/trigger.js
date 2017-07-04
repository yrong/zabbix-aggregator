'use strict';

const Router = require('koa-router')
const _ = require('lodash')
const db = require('../lib/db')
const triggerSqlGenerator = require('../sql/trigger')
const alias = require('../sql/alias')
const config = require('config')
const cmdb_api_helper = require('../helper/cmdb_api_helper')
const groupList = ["Network","Windows Servers","Linux servers","Virtual machines","Exchange Servers","Out of Band","ESX","Storage","TSM Backup Jobs"]
const priorityList=["Information","Warning","Average","High","Disaster"]
const HostsNotExist = `("NOTEXIST")`
const moment = require('moment')

const categories_by_value = ['value'],categories_by_itservice_value = ['itservice','value'].sort(),
    categories_by_hostgroup_priority = ['gpname','priority'].sort(),categories_by_lastchange_value =['lastchange','value'].sort()

let triggers = new Router();

const buildHostFilter = async (filter)=>{
    let hosts,results;
    if(_.isArray(filter.itservicegroup)&&filter.itservicegroup.length){
        results = await cmdb_api_helper.apiInvokeFromCmdb('/api/cfgItems',{cfgHostsByITServiceGroup:filter.itservicegroup.join()})
        filter.hosts = HostsNotExist
    }else if(_.isArray(filter.itservice)&&filter.itservice.length){
        results = await cmdb_api_helper.apiInvokeFromCmdb('/api/cfgItems',{cfgHostsByITService:filter.itservice.join()})
        filter.hosts = HostsNotExist
    }
    if(results&&results.data&&results.data.length){
        hosts = _.map(results.data,(result)=>{return '"' + result.name + '"'})
        filter = filter || {}
        filter.hosts = '(' + hosts.join() + ')'
    }
    return filter
}

const groupByHostGroupAndPriority = async (filter,groupBy)=>{
    filter = await buildHostFilter(filter)
    groupBy = [alias.group_name_alias,alias.trigger_priority_alias].join()
    let stat = {},all;
    let [groups] = await db.query(triggerSqlGenerator.sqlCountTriggersByGroup(filter,groupBy))
    let [rows] = await db.query(triggerSqlGenerator.sqlCountTriggersByGroup(filter))
    all = rows[0][alias.count_alias]
    for(let group of groups){
        filter[alias.group_name_alias]  = group[alias.group_name_alias], filter[alias.trigger_priority_alias] = group[alias.trigger_priority_alias]
        let [rows] = await db.query(triggerSqlGenerator.sqlFindTriggers(filter))
        stat[filter[alias.group_name_alias]] = stat[filter[alias.group_name_alias]]||{}
        stat[filter[alias.group_name_alias]][filter[alias.trigger_priority_alias]] = rows
    }
    return {all,groupList,priorityList,stat}
}

const groupByLastChangeAndValue = async (filter,groupBy)=>{
    filter = await buildHostFilter(filter)
    filter.lastchange_period = groupBy.period = groupBy.period || 'days'
    if(groupBy.latest){
        filter.since = moment().subtract(groupBy.latest, filter.lastchange_period).unix()
        filter.until = moment().unix()
    }
    groupBy = [alias.trigger_lastchange_date_alias,alias.trigger_value_alias].join()
    let result = {}
    let [groups] = await db.query(triggerSqlGenerator.sqlCountTriggersByGroup(filter,groupBy))
    for(let group of groups){
        result[group[alias.trigger_lastchange_date_alias]] = result[group[alias.trigger_lastchange_date_alias]]||{}
        result[group[alias.trigger_lastchange_date_alias]][group[alias.trigger_value_alias]] = group[alias.count_alias]
    }
    return result
}
const countTriggerByValue = async (filter)=>{
    let groupBy = [alias.trigger_value_alias].join(),results,result={}
    results = await db.query(triggerSqlGenerator.sqlCountTriggersByGroup(filter,groupBy))
    for(let entry of results[0]){
        result[entry[alias.trigger_value_alias]] = entry[alias.count_alias]
    }
    return result
}

const countTriggerByITServiceGroup = async (filter)=>{
    let results = await cmdb_api_helper.getITServiceGroups(),result={}
    for(let group of results.data){
        filter.itservicegroup = [group.name]
        filter = await buildHostFilter(filter)
        result[group.name] = await countTriggerByValue(filter)
    }
    return result
}

const countTriggerByITService = async (filter)=>{
    let results = await cmdb_api_helper.getITServiceGroups(),result={}
    for(let group of results.data){
        for(let service of group.members){
            result[group.name] = result[group.name] || {}
            filter.itservice = [service.name]
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
        result = await groupByHostGroupAndPriority(filter,groupBy)
    }else if(_.isEqual(category_list,categories_by_lastchange_value)){
        if(groupBy.period&&(groupBy.period!=='years'&&groupBy.period!=='months')&&groupBy.period!=='days')
            throw new Error('groupBy period unknown!')
        result = await groupByLastChangeAndValue(filter,groupBy)
    }else if(_.isEqual(category_list,categories_by_itservice_value)){
        if(groupBy.depth === 0)
            result_depth = await countTriggerByITServiceGroup(filter)
        else if(groupBy.depth === 1)
            result_depth = _.assign({},await countTriggerByITServiceGroup(filter),await countTriggerByITService(filter))
        result = _.assign(result,result_depth)
    }else{
        throw new Error('groupBy category unknown!')
    }
    ctx.body = result
})

const activeTriggerHandler = async(ctx)=>{
    let filter = await buildHostFilter(ctx.request.body.filter)
    let [rows] = await db.query(triggerSqlGenerator.sqlFindTriggers(filter))
    ctx.body=rows
}

triggers.post('/search', activeTriggerHandler)



module.exports = triggers