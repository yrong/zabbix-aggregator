'use strict';

const Router = require('koa-router')
const _ = require('lodash')
const db = require('../lib/db')
const common = require('scirichon-common')
const cmdb_api_url = common.getServiceApiUrl('cmdb')

let hosts = new Router();
hosts.get('/', async (ctx, next)=>{
    let params = _.assign({},ctx.params,ctx.query,ctx.request.body)
    let sql = `select hostid,name from hosts where status!=3 and flags=0 and host not like "%zabbix%"`
    if(params.name){
        sql += ` and name like "%${params.name}%"`
    }
    let hosts = await db.query(sql)
    ctx.body = hosts
});

hosts.get('/compare_with_cmdb', async (ctx, next)=>{
    let results,cmdb_hosts=[],zabbix_hosts=[]
    results = await common.apiInvoker('GET',cmdb_api_url,'/api/cfgItems',{subcategory:'PhysicalServer,VirtualServer'})
    if(results.data&&results.data.length){
        cmdb_hosts = _.map(results.data,(result)=>result.name)
    }
    let sql = `select name from hosts where status!=3 and flags=0 and host not like "%zabbix%"`
    let hosts = await db.query(sql)
    if(hosts&&hosts.length){
        zabbix_hosts = _.map(hosts,(result)=>result.name)
    }
    let zabbix_missing = _.difference(cmdb_hosts,zabbix_hosts)
    let cmdb_missing = _.difference(zabbix_hosts,cmdb_hosts)
    ctx.body = {cmdb_hosts,zabbix_hosts,cmdb_missing,zabbix_missing}
});

module.exports = hosts
