'use strict';

const Router = require('koa-router')
const _ = require('lodash')
const db = require('../lib/db')
const eventsSqlGenerator = require('../sql/event')

let events = new Router();

events.post('/search', async (ctx, next)=>{
    let params = _.assign({},ctx.params,ctx.query,ctx.request.body),sql
    sql = eventsSqlGenerator.sqlGetTriggerEvents(params)
    let events = await db.query(sql)
    ctx.body = events
});


module.exports = events
