'use strict';

const compose = require('koa-compose')
const common = require('scirichon-common')
const responseWrapper = require('scirichon-response-wrapper')
const checkToken = require('scirichon-token-checker')

module.exports = function middleware() {
    return compose(
        [
            responseWrapper(),
            checkToken({check_token_url:`${common.getServiceApiUrl('auth')}/auth/check`})
        ]
    )
}
