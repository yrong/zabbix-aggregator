'use strict';

const compose = require('koa-compose')
const checkToken = require('./checkToken')
const responseWrapper = require('./responseWrapper')

module.exports = function middleware() {
    return compose(
        [
            responseWrapper(),
            checkToken()
        ]
    )
}
