'use strict';

const mysql = require('mysql2/promise')
const config = require('config')
const LOG = require('log4js_wrapper')
const logger = LOG.getLogger()

const pool = mysql.createPool(config.get('mysql'));

const query = async (sql)=>{
    logger.debug(sql)
    return await pool.query(sql)
}

module.exports  = {query}