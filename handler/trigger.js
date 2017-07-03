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
let triggers = new Router();


const HostsNotExist = `("NOTEXIST")`
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


triggers.post('/groupBy/HostGroupAndPriority', async (ctx)=>{
    let stat = {},all,filter = await buildHostFilter(ctx.request.body.filter),groupby = [alias.group_name_alias,alias.trigger_priority_alias].join()
    let [groups] = await db.query(triggerSqlGenerator.sqlCountTriggersByGroup(filter,groupby))
    let [rows] = await db.query(triggerSqlGenerator.sqlCountTriggersByGroup(filter))
    all = rows[0][alias.count_alias]
    for(let group of groups){
        filter[alias.group_name_alias]  = group[alias.group_name_alias], filter[alias.trigger_priority_alias] = group[alias.trigger_priority_alias]
        let [rows] = await db.query(triggerSqlGenerator.sqlFindTriggers(filter))
        stat[filter[alias.group_name_alias]] = stat[filter[alias.group_name_alias]]||{}
        stat[filter[alias.group_name_alias]][filter[alias.trigger_priority_alias]] = rows
    }
    ctx.body={all,groupList,priorityList,stat}
});

triggers.post('/groupBy/LastChangeAndValue', async (ctx)=>{
    let filter = await buildHostFilter(ctx.request.body.filter),groupby = [alias.trigger_lastchange_date_alias,alias.trigger_value_alias].join(),result = {}
    let [groups] = await db.query(triggerSqlGenerator.sqlCountTriggersByGroup(filter,groupby))
    for(let group of groups){
        result[group[alias.trigger_lastchange_date_alias]] = result[group[alias.trigger_lastchange_date_alias]]||{}
        result[group[alias.trigger_lastchange_date_alias]][group[alias.trigger_value_alias]] = group[alias.count_alias]
    }
    ctx.body= result
});

const countTriggerByValue = async (filter)=>{
    let groupby = [alias.trigger_value_alias].join(),results,result={}
    results = await db.query(triggerSqlGenerator.sqlCountTriggersByGroup(filter,groupby))
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


triggers.post('/count',async (ctx)=>{
    let filter = ctx.request.body.filter||{}, depth = ctx.request.body.depth || 0,
        result = await countTriggerByValue(filter),result_depth_1,result_depth_2;
    if(depth == 1){
        result_depth_1 = await countTriggerByITServiceGroup(filter)
        _.assign(result,result_depth_1)
    }else if(depth == 2){
        result_depth_1 = await countTriggerByITServiceGroup(filter)
        filter = _.omit(filter,['hosts','itservicegroup'])
        result_depth_2 = await countTriggerByITService(filter)
        _.assign(result,result_depth_1,result_depth_2)
    }
    ctx.body=result
})

const activeTriggerHandler = async(ctx)=>{
    let filter = await buildHostFilter(ctx.request.body.filter)
    let [rows] = await db.query(triggerSqlGenerator.sqlFindTriggers(filter))
    ctx.body=rows
}

triggers.post('/search', activeTriggerHandler)



module.exports = triggers