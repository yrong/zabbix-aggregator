'use strict';

const Router = require('koa-router')
const _ = require('lodash')
const db = require('../lib/db')
const triggerSqlGenerator = require('../sql/trigger')
const alias = require('../sql/alias')
const rp = require('request-promise')
const config = require('config')

const groupList = ["Network","Windows Servers","Linux servers","Virtual machines","Exchange Servers","Out of Band","ESX","Storage","TSM Backup Jobs"]

const priorityList=["Information","Warning","Average","High","Disaster"]

const Status_Problem = triggerSqlGenerator.Status_Problem,Status_Normal = triggerSqlGenerator.Status_Normal

let triggers = new Router();

const buildConfig = async (ctx)=>{
    let filter = ctx.request.body.filter||{},itservicegroup_hosts_url,options,hosts,results;
    if(_.isArray(filter.itservicegroup)&&filter.itservicegroup.length){
        itservicegroup_hosts_url = config.get('cmdb.base_url') + '/api/cfgItems/assoc/group?group_names=' + filter.itservicegroup.join()
        options = {uri:itservicegroup_hosts_url,method:'GET',json:true}
        results = await rp(options)
        if(results.data&&results.data.length){
            hosts = _.map(results.data,(result)=>{return '"' + result.name + '"'})
            filter.hosts = '(' + hosts.join() + ')'
        }
    }
    return filter;
}

triggers.post('/groupBy/HostGroupAndPriority', async (ctx)=>{
    let stat = {},all,filter = await buildConfig(ctx),groupby = [alias.group_name_alias,alias.trigger_priority_alias].join()
    let [groups] = await db.query(triggerSqlGenerator.sqlGroupTriggers(filter,groupby))
    let [rows] = await db.query(triggerSqlGenerator.sqlCountTriggers(filter))
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
    let filter = await buildConfig(ctx),groupby = [alias.trigger_lastchange_date_alias,alias.trigger_value_alias].join(),result = {}
    let [groups] = await db.query(triggerSqlGenerator.sqlGroupTriggers(filter,groupby))
    for(let group of groups){
        result[group[alias.trigger_lastchange_date_alias]] = result[group[alias.trigger_lastchange_date_alias]]||{}
        result[group[alias.trigger_lastchange_date_alias]][group[alias.trigger_value_alias]] = group[alias.count_alias]
    }
    ctx.body= result
});

triggers.post('/count',async (ctx)=>{
    let abnormal,normal,results,filter = await buildConfig(ctx)
    filter.value = Status_Problem
    results = await db.query(triggerSqlGenerator.sqlCountTriggers(filter))
    abnormal = results[0][0][alias.count_alias]
    filter.value = Status_Normal
    results = await db.query(triggerSqlGenerator.sqlCountTriggers(filter))
    normal = results[0][0][alias.count_alias]
    ctx.body={abnormal,normal}
})

const activeTriggerHandler = async(ctx)=>{
    let filter = await buildConfig(ctx)
    let [rows] = await db.query(triggerSqlGenerator.sqlFindTriggers(filter))
    ctx.body=rows
}

triggers.post('/search', activeTriggerHandler)



module.exports = triggers