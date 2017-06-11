'use strict';

const log4js = require('log4js')
const config = require('config')
const logger = log4js.getLogger(config.get('logger.defaultCategory'))
const level = config.get('logger.defaultLevel')
logger.setLevel(level)
module.exports = logger