'use strict';

const compose = require('koa-compose')
const config = require('config')
const responseWrapper = require('scirichon-response-wrapper')
const checkToken = require('scirichon-token-checker')

module.exports = function middleware() {
    return compose(
        [
            responseWrapper(),
            checkToken({check_token_url:`http://${config.get('privateIP')||'localhost'}:${config.get('auth.port')}/auth/check`})
        ]
    )
}
