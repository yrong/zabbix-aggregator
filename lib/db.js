'use strict';

const mysql = require('mysql')
const config = require('config')
const LOG = require('log4js_wrapper')
const logger = LOG.getLogger()
const pool = mysql.createPool(config.get('mysql'))

const query = async (sql,values)=>{
    return new Promise((resolve,reject)=>{
        logger.debug(sql)
        pool.query(sql,values,(error,result)=>{
            if(error)
                reject(error)
            resolve(result)
        })
    })
}

module.exports  = {query}