'use strict';

const Router = require('koa-router')
const _ = require('lodash')
const config = require('config')
const db = require('../lib/db')
const triggerSqlGenerator = require('../sql/trigger')
const alias = require('../sql/alias')
const groupList = ["Network","Windows Servers","Linux servers","Virtual machines","Exchange Servers","Out of Band","ESX","Storage","TSM Backup Jobs"]
const priorityList=["Information","Warning","Average","High","Disaster"]
const HostsNotExist = `("NOTEXIST")`
const moment = require('moment')
const common = require('scirichon-common')
const cmdb_api_url = common.getServiceApiUrl('cmdb')

const categories_by_value = ['value'],categories_by_itservice_value = ['itservice','value'].sort(),
    categories_by_hostgroup_priority = ['gpname','priority'].sort(),categories_by_lastchange_value =['lastchange','value'].sort()

let triggers = new Router();

const buildHostFilter = async (filter)=>{
    let hosts,results;
    if(_.isArray(filter.itservice)&&filter.itservice.length){
        results = await common.apiInvoker('POST',cmdb_api_url,'/api/searchByCypher',{category:"ConfigurationItem",cypherQueryFile:'queryHostsByITService',uuid:filter.itservice})
        results = results.data||results
        filter.host = HostsNotExist
    }
    if(results&&results.length){
        hosts = _.map(results,(result)=>result.name)
        filter = filter || {}
        filter.host = hosts
    }
    return filter
}

const countByHostGroupAndPriority = async (filter,groupBy)=>{
    filter = await buildHostFilter(filter)
    groupBy = [alias.group_name_alias,alias.trigger_priority_alias].join()
    let stat = {},all;
    let groups = await db.query(triggerSqlGenerator.sqlCountTriggersByGroup(filter,groupBy))
    let rows = await db.query(triggerSqlGenerator.sqlCountTriggersByGroup(filter))
    all = rows[0][alias.count_alias]
    for(let group of groups){
        filter[alias.group_name_alias]  = group[alias.group_name_alias], filter[alias.trigger_priority_alias] = group[alias.trigger_priority_alias]
        rows = await db.query(triggerSqlGenerator.sqlFindTriggers(filter))
        stat[filter[alias.group_name_alias]] = stat[filter[alias.group_name_alias]]||{}
        stat[filter[alias.group_name_alias]][filter[alias.trigger_priority_alias]] = rows
    }
    return {all,groupList,priorityList,stat}
}

const countByLastChangeAndValue = async (filter,groupBy)=>{
    filter = await buildHostFilter(filter)
    let time_unit = groupBy.time_unit || 'day',granularity = groupBy.granularity || 1,latest = groupBy.latest,interval,format,date
    filter.time_unit = time_unit ==='year'?'years':time_unit === 'month'?'months':'days'
    format = time_unit ==='year'?'YYYY':time_unit === 'month'?'YYYY-MM':'YYYY-MM-DD'
    filter.granularity = granularity
    if(latest){
        filter.since = moment().subtract(latest*granularity, filter.time_unit).unix()
        filter.until = moment().unix()
    }
    groupBy = [alias.trigger_lastchange_timespan_alias,alias.trigger_value_alias].join()
    let result = {}
    let groups = await db.query(triggerSqlGenerator.sqlCountTriggersByGroup(filter,groupBy))
    for(let group of groups){
        interval = group[alias.trigger_lastchange_timespan_alias]
        date = moment.unix(filter.until).subtract((interval)*granularity,filter.time_unit).format(format)
        result[date] = result[date]||{}
        result[date][group[alias.trigger_value_alias]] = group[alias.count_alias]
    }
    return result
}
const countTriggerByValue = async (filter)=>{
    let groupBy = [alias.trigger_value_alias].join(),results,result={}
    results = await db.query(triggerSqlGenerator.sqlCountTriggersByGroup(filter,groupBy))
    for(let entry of results){
        result[entry[alias.trigger_value_alias]] = entry[alias.count_alias]
    }
    return result
}

const countTriggerByITServiceGroup = async (filter)=>{
    let results = await common.apiInvoker('GET',cmdb_api_url,'/api/it_services/group'),result={}
    results = results.data||results
    for(let group of results){
        filter.itservice = [group.uuid]
        filter = await buildHostFilter(filter)
        result[group.name] = await countTriggerByValue(filter)
    }
    return result
}

const countTriggerByITService = async (filter)=>{
    let results = await common.apiInvoker('POST',cmdb_api_url,'/api/members','',{category:'ITServiceGroup'}),result={}
    results = results.data||results
    filter = _.omit(filter,['host','itservicegroup'])
    if(results&&results.length){
        for(let group of results){
            if(group.members){
                for(let service of group.members){
                    result[group.name] = result[group.name] || {}
                    filter.itservice = [service.uuid]
                    filter = await buildHostFilter(filter)
                    result[group.name][service.name] = await countTriggerByValue(filter)
                }
            }
        }
    }
    return result
}

triggers.post('/count', async (ctx)=>{
    let groupBy = ctx.request.body.groupBy,filter = ctx.request.body.filter||{},result,result_depth,category_list
    result = await countTriggerByValue(filter)
    if(!groupBy||!groupBy.category||!groupBy.category.length)
        throw new Error('count missing groupBy field!')
    category_list = groupBy.category.sort()
    if(_.isEqual(category_list,categories_by_value)){
    }else if(_.isEqual(category_list,categories_by_hostgroup_priority)){
        result = await countByHostGroupAndPriority(filter,groupBy)
    }else if(_.isEqual(category_list,categories_by_lastchange_value)){
        if(groupBy.time_unit&&(groupBy.time_unit!=='year'&&groupBy.time_unit!=='month')&&groupBy.time_unit!=='day')
            throw new Error('groupBy time_unit unknown,only year|month|day support')
        if(groupBy.granularity&&!(_.isInteger(groupBy.granularity)))
            throw new Error('groupBy granularity should be integer')
        if(groupBy.latest&&!(_.isInteger(groupBy.latest)))
            throw new Error('groupBy latest should be integer')
        result = await countByLastChangeAndValue(filter,groupBy)
    }else if(_.isEqual(category_list,categories_by_itservice_value)){
        result_depth = await countTriggerByITServiceGroup(filter)
        if(groupBy.depth === 0){
        }
        else if(groupBy.depth === 1){
            result_depth = _.assign(result_depth,await countTriggerByITService(filter))
        }else{
            throw new Error('depth only support 0|1')
        }
        result = _.assign(result,result_depth)
    }else{
        throw new Error('groupBy category unknown!')
    }
    ctx.body = result
})

const activeTriggerHandler = async(ctx)=>{
    let params = _.assign({},ctx.params,ctx.query,ctx.request.body),filter = await buildHostFilter(ctx.request.body.filter)
    let rows = await db.query(triggerSqlGenerator.sqlFindTriggers(filter,params.pagination))
    ctx.body=rows
}

const triggers_statistic_index_name = config.get('scmpz.statistic_tbl_name')

const searchES = async(params)=>{
    params.size = params.size || 0
    let searchObj = _.assign({index: triggers_statistic_index_name},_.omit(params,['token','interval','group','hosts']))
    let result = await db.esClient.search(searchObj)
    return _.pick(result,['hits','aggregations'])
}

const statisticTriggerHandler = async(ctx)=>{
    let params = _.assign({},ctx.query,ctx.params,ctx.request.body)
    if(!params.body){
        throw new Error('missing body field')
    }
    ctx.body= await searchES(params)
}

const getHostsByGroup = async(groupid)=>{
    let sql = `select hosts.hostid from hosts inner join hosts_groups on hosts.hostid=hosts_groups.hostid where hosts_groups.groupid=${groupid}`
    let hosts = await db.query(sql)
    return _.map(hosts,(host)=>host.hostid)
}

const WrittenTimeAndPriorityHandler = async(ctx)=>{
    let params = _.assign({},ctx.query,ctx.params,ctx.request.body),result,time_buckets,status_buckets,value_buckets,
        priority_buckets,abnormalItemsCount,interval,since,until,timeRangeCond,hostsCond,hosts,conds=[]
    params.body = params.body||{},interval = params.interval||"day",hosts = params.hosts
    if (!params.body.query) {
        if(interval==='day'){
            since = 'now-1M/M'
            until = 'now/M'
        }
        else if(interval==='hour'){
            since = 'now-1d/d'
            until = 'now/d'
        }
        else if(interval==='month'){
            since = 'now-1y/y'
            until = 'now/y'
        }else{
            throw new Error('interval not support yet')
        }
        timeRangeCond = {
            "range": {
                "writtentime": {
                    "gt": since,
                    "lte": until
                }
            }
        }
        conds.push(timeRangeCond)
        if(params.group){
            hosts = await getHostsByGroup(params.group)
        }
        if(hosts&&hosts.length){
            hostsCond = {
                "terms":{
                    "hostid":hosts
                }
            }
            conds.push(hostsCond)
        }
        params.body.query = {
            "bool": {
                "must": conds
            }
        }
    }
    if (!params.body.aggs) {
        params.body.aggs = {
            "writtentime": {
                "date_histogram": {
                    "field": "writtentime",
                    "interval": interval,
                    "format": "yyyy-MM-dd hh:mm",
                    "time_zone": "PRC"
                },
                "aggs": {
                    "writtentime": {
                        "cardinality": {
                            "field": "writtentime"
                        }
                    },
                    "triggerstatus": {
                        "terms": {"field": "triggerstatus"},
                        "aggs": {
                            "triggervalue": {
                                "terms": {"field": "triggervalue"},
                                "aggs": {
                                    "triggerpriority": {
                                        "terms": {"field": "triggerpriority"}
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    result = await searchES(params)
    time_buckets = result&&result.aggregations&&result.aggregations.writtentime&&result.aggregations.writtentime.buckets
    if(!_.isEmpty(time_buckets)){
        for(let time_bucket of time_buckets){
            abnormalItemsCount = 0
            status_buckets = time_bucket.triggerstatus&&time_bucket.triggerstatus.buckets
            if(!_.isEmpty(status_buckets)) {
                for (let status_bucket of status_buckets) {
                    if (status_bucket.key == 0) {
                        value_buckets = status_bucket.triggervalue&&status_bucket.triggervalue.buckets
                        if(!_.isEmpty(value_buckets)) {
                            for (let value_bucket of value_buckets) {
                                if (value_bucket.key == 1) {
                                    priority_buckets = value_bucket.triggerpriority && value_bucket.triggerpriority.buckets
                                    if(!_.isEmpty(priority_buckets)) {
                                        for (let priority_bucket of priority_buckets) {
                                            if (priority_bucket.key > 1) {
                                                abnormalItemsCount += priority_bucket.doc_count
                                            }
                                        }
                                        time_bucket.abnormalItemsCount = abnormalItemsCount/time_bucket.writtentime.value
                                        time_bucket.normalItemsCount = (time_bucket.doc_count - abnormalItemsCount)/time_bucket.writtentime.value
                                        time_bucket.avg_doc_count = (time_bucket.doc_count)/time_bucket.writtentime.value
                                        time_bucket.health = time_bucket.normalItemsCount/time_bucket.avg_doc_count
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    ctx.body = result
}


triggers.post('/search', activeTriggerHandler)

triggers.post('/advancedSearch',statisticTriggerHandler)

triggers.post('/aggrsByWrittenTimeAndPriority',WrittenTimeAndPriorityHandler)



module.exports = triggers