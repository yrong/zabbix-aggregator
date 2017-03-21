'use strict';

import Router from 'koa-router';
import _ from 'lodash'
import db from '../lib/db'

let hosts = new Router();
hosts.get('/', async (ctx, next)=>{
    let params = _.assign({},ctx.params,ctx.query,ctx.request.body)
    let sql = `select hostid,name from hosts where status!=3 and flags=0 and host not like "%zabbix%"`
    if(params.name){
        sql += ` and name like "%${params.name}%"`
    }
    let [hosts] = await db.query(sql)
    ctx.body = hosts
});

export default hosts
