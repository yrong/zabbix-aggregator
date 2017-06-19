'use strict';

const compose = require('koa-compose')
const config = require('config')
const responseWrapper = require('koa-response-wrapper')
const checkToken = require('koa-token-checker')

module.exports = function middleware() {
    return compose(
        [
            responseWrapper(),
            checkToken(config.get('auth'))
        ]
    )
}
