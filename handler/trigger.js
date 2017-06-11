'use strict';

const Router = require('koa-router')
const _ = require('lodash')
const db = require('../lib/db')
const triggerSqlGenerator = require('../sql/trigger')
const alias = require('../sql/alias')

const groupList = ["Network","Windows Servers","Linux servers","Virtual machines","Exchange Servers","Out of Band","ESX","Storage","TSM Backup Jobs"]

const priorityList=["Information","Warning","Average","High","Disaster"]

const Status_Problem = triggerSqlGenerator.Status_Problem,Status_Normal = triggerSqlGenerator.Status_Normal

let triggers = new Router();
triggers.all('/group', async (ctx, next)=>{
    let stat = {},all,groupName,priority
    let [groups] = await db.query(triggerSqlGenerator.sqlGroupTriggersByGroupName(Status_Problem))
    let [rows] = await db.query(triggerSqlGenerator.sqlCountTriggers(Status_Problem))
    all = rows[0][alias.count_alias]
    for(let group of groups){
        groupName = group[alias.group_name_alias],priority = group[alias.trigger_priority_alias]
        let [rows] = await db.query(triggerSqlGenerator.sqlFindTriggersWithCondition(groupName,priority,Status_Problem))
        stat[groupName] = stat[groupName]||{}
        stat[groupName][priority] = rows
    }
    ctx.body={all,groupList,priorityList,stat}
});

triggers.all('/history',async (ctx,next)=>{
    let params = _.assign({},ctx.params,ctx.query,ctx.request.body),since,until,abnormal,normal,result
    if(!_.isString(params.since)||!_.isString(params.until)){
        ctx.throw("missing params!")
    }
    since = parseInt(params.since),until = parseInt(params.until)
    result = await db.query(triggerSqlGenerator.sqlCountTriggers(Status_Problem,since,until))
    abnormal = result[0][0][alias.count_alias]
    result = await db.query(triggerSqlGenerator.sqlCountTriggers(Status_Normal,since,until))
    normal = result[0][0][alias.count_alias]
    ctx.body={abnormal,normal}
})

const activeTriggerHandler = async(ctx,next)=>{
    let [rows] = await db.query(triggerSqlGenerator.sqlFindTriggersInGroup(ctx.params.group,Status_Problem))
    ctx.body=rows
}

triggers.all('/', activeTriggerHandler)

triggers.all('/active', activeTriggerHandler)

triggers.all('/active/:group', activeTriggerHandler)

triggers.all('/')

module.exports = triggers