'use strict';

import Router from 'koa-router';
import db from '../lib/db'
import * as itemSqlGenerator from '../sql/item'
import * as historyValueSqlGenerator from '../sql/history'

let items = new Router();

items.post('/search', async(ctx,next)=>{
    let params = ctx.request.body
    let [item_rows] = await db.query(itemSqlGenerator.sqlSearchItems(params.appName,params.hosts,params.items))
    if(params.drillDown){
        for (let item of item_rows){
            let [history_value_rows] = await db.query(historyValueSqlGenerator.sqlGetLatestItemValueInHistory(item.value_type,item.itemid))
            item.value = history_value_rows[0].value
        }
    }
    ctx.body={status:'ok',data:item_rows}
})

export default items