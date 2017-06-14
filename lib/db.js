'use strict';

const mysql = require('mysql2/promise')
const config = require('config')
const logger = require('../logger')

const pool = mysql.createPool(config.get('mysql'));

const query = async (sql)=>{
    logger.debug(sql)
    return await pool.query(sql)
}

module.exports  = {query}