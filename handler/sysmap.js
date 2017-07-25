'use strict';

const Router = require('koa-router')
const _ = require('lodash')
const logger = require('log4js_wrapper').getLogger()
const db = require('../lib/db')
const sysmapSqlGenerator = require('../sql/sysmap')
const itemSqlGenerator = require('../sql/item')
const itemHistorySqlGenerator = require('../sql/history')

let sysmaps = new Router();

sysmaps.get('/', async (ctx)=>{
    let sql = sysmapSqlGenerator.sqlGetSysMaps()
    let [maps] = await db.query(sql)
    ctx.body = maps
});

const replaceElementLabel = (element)=>{
    element.label = element.name
    delete element.name
    return element
}

const replaceLinkLabel = async (link)=>{
    let curly_bracket_re = /{([^}]+)}/g,zabbix_macro_re = /(.*):(.*)\.(.*)/,
        macro,zabbix_macros =[],sql
    if(!_.isEmpty(link.label)){
        while(macro = curly_bracket_re.exec(link.label)) {
            zabbix_macros.push(macro[1]);
        }
        for(let zabbix_macro of zabbix_macros){
            macro = zabbix_macro_re.exec(zabbix_macro)
            if(macro.length!=4&&macro[3]!="last(0)"){
                logger.warn(`macro invalid!${macro}`)
                continue
            }
            sql = itemSqlGenerator.sqlGetItemFromItemKeyandHostName(macro[2],macro[1])
            let [item] = await db.query(sql)
            if(item.length != 1){
                logger.warn(`item not found with host "${macro[1]}" and item_key "${macro[2]}"`)
                continue
            }
            sql = itemHistorySqlGenerator.sqlGetLatestItemValueInHistory(item[0].value_type,item[0].itemid)
            let [item_value] = await db.query(sql)
            if(item_value.length !=1){
                logger.warn(`item ${item[0].itemid} history value not found`)
                continue
            }
            link.label = link.label.replace(`{${zabbix_macro}}`,item_value[0].value)
        }
    }
    return link
}

sysmaps.post('/', async (ctx)=>{
    let params = _.assign({},ctx.params,ctx.query,ctx.request.body),sql,sysmapid=params.sysmapid
    if(!sysmapid)
        throw new Error('missing sysmapid as parameter')
    sql = sysmapSqlGenerator.sqlGetHostElementsInSysMap(sysmapid)
    let [elements] = await db.query(sql)
    elements = _.map(elements,(element)=>replaceElementLabel(element))
    sql = sysmapSqlGenerator.sqlGetLinksInSysMap(sysmapid)
    let [links] = await db.query(sql)
    for (let link of links){
        link = await replaceLinkLabel(link)
    }
    sql = sysmapSqlGenerator.sqlGetLinkTriggersInSysMap(sysmapid)
    let [triggers] = await db.query(sql)
    ctx.body = {elements,links,triggers}
});


module.exports = sysmaps
