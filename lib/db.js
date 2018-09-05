'use strict';

const mysql = require('mysql')
const config = require('config')
const logger = require('log4js-wrapper-advanced').getLogger()
const pool = mysql.createPool(config.get('mysql-zabbix'))

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

module.exports  = {query}