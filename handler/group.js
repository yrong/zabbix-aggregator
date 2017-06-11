'use strict';

const Router = require('koa-router')
const _ = require('lodash')
const db = require('../lib/db')

let groups = new Router();

groups.get('/', async (ctx, next)=>{
    let params = _.assign({},ctx.params,ctx.query,ctx.request.body)
    let sql = `select groupid,name from groups where internal=0 and name not like "%zabbix%" and name not like "Templates"`
    if(params.name){
        sql += ` and name like "%${params.name}%"`
    }
    let [groups] = await db.query(sql)
    ctx.body = groups
});

groups.get('/host', async (ctx, next)=>{
    let params = _.assign({},ctx.params,ctx.query,ctx.request.body)
    if(!_.isString(params.name)){
        ctx.throw("missing param!")
    }
    let sql = `select groups.groupid,hosts.name from groups
            inner join hosts_groups on groups.groupid=hosts_groups.groupid
            inner join hosts on hosts.hostid=hosts_groups.hostid
            where groups.name="${params.name}"`
    let [group_hosts] = await db.query(sql)
    ctx.body = group_hosts
});

module.exports = groups
