'use strict';

import Router from 'koa-router';
import db from '../lib/db'
import * as sqlGenerator from '../sql/trigger'

const groupList = ["Network","Windows Servers","Linux servers","Virtual machines","Exchange Servers","Out of Band","ESX","Storage","TSM Backup Jobs"]

const priorityList=["Information","Warning","Average","High","Disaster"]

let triggers = new Router();
triggers.get('/group', async (ctx, next)=>{
    let sql,stat = {},all,group,groupName,priority
    let [groups] = await db.query(sqlGenerator.sqlGroupTriggersActiveByGroupName())
    let [rows] = await db.query(sqlGenerator.sqlCountTriggers())
    all = rows[0][sqlGenerator.count_alias]
    for(group of groups){
        groupName = group[sqlGenerator.group_name_alias],priority = group['priority']
        let [rows] = await db.query(sqlGenerator.sqlFindTriggersWithCondition(groupName,priority))
        stat[groupName] = stat[groupName]||{}
        stat[groupName][priority] = rows
    }
    ctx.body={status:'ok',data:{all,groupList,priorityList,stat}}
});

const activeTriggerHandler = async(ctx,next)=>{
    let [rows] = await db.query(sqlGenerator.sqlFindTriggersActiveInGroup(ctx.params.group))
    ctx.body={status:'ok',data:rows}
}

triggers.get('/', activeTriggerHandler)

triggers.get('/active', activeTriggerHandler)

triggers.get('/active/:group', activeTriggerHandler)

export default triggers