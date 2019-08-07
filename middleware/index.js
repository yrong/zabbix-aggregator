'use strict';

const compose = require('koa-compose')
const common = require('scirichon-common')
const responseWrapper = require('scirichon-response-wrapper')
const authenticator = require('scirichon-authenticator')

module.exports = function middleware() {
    return compose(
        [
            responseWrapper(),
            authenticator.checkToken({check_token_url:`${common.getServiceApiUrl('auth')}/auth/check`})
        ]
    )
}
