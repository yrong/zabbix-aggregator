'use strict';

const mysql = require('mysql')
const config = require('config')
const logger = require('log4js-wrapper-advanced').getLogger()
const pool = mysql.createPool(config.get('mysql-zabbix'))

const elasticsearch = require('elasticsearch')
const esConfig = config.get('elasticsearch')
const esClient = new elasticsearch.Client({
    host: (process.env['ES_HOST']||esConfig.host) + ":" + esConfig.port,
    httpAuth:esConfig.user +":" + esConfig.password,
    requestTimeout: esConfig.requestTimeout
})

const query = async (sql,values,multiple)=>{
    return new Promise((resolve,reject)=>{
        logger.debug(sql)
        values = multiple?[values]:values
        pool.query(sql,values,(error,result)=>{
            if(error)
                reject(error)
            resolve(result)
        })
    })
}

module.exports  = {query,esClient}