'use strict';

import log4js from 'log4js'
import config from 'config'
const logger = log4js.getLogger(config.get('config.logger.defaultCategory'))
const level = config.get('config.logger.defaultLevel')
logger.setLevel(level)
export default logger