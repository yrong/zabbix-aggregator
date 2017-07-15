'use strict';

const Router = require('koa-router')
const _ = require('lodash')
const db = require('../lib/db')
const sysmapSqlGenerator = require('../sql/sysmap')

let sysmaps = new Router();

sysmaps.get('/', async (ctx)=>{
    let sql = sysmapSqlGenerator.sqlGetSysMaps()
    let [maps] = await db.query(sql)
    ctx.body = maps
});

sysmaps.post('/', async (ctx)=>{
    let params = _.assign({},ctx.params,ctx.query,ctx.request.body),sql,sysmapid=params.sysmapid
    if(!sysmapid)
        throw new Error('missing sysmapid as parameter')
    sql = sysmapSqlGenerator.sqlGetHostElementsInSysMap(sysmapid)
    let [elements] = await db.query(sql)
    sql = sysmapSqlGenerator.sqlGetLinksInSysMap(sysmapid)
    let [links] = await db.query(sql)
    sql = sysmapSqlGenerator.sqlGetLinkTriggersInSysMap(sysmapid)
    let [triggers] = await db.query(sql)
    ctx.body = {elements,links,triggers}
});


module.exports = sysmaps
