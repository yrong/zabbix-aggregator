const Koa = require('koa')
const config = require('config')
const cors = require('kcors')
const bodyParser = require('koa-bodyparser')
const logger = require('log4js_wrapper')
logger.initialize(config.get('logger'))
const app = new Koa()
const middleware = require('./middleware')
const router = require('./routes')
const convert = require('koa-convert')
const Static = require('koa-static')
const mount = require('koa-mount')

app
    .use(cors({credentials: true}))
    .use(bodyParser())
    .use(mount("/", convert(Static(__dirname + '/public'))))
    .use(middleware())
    .use(router.routes());

app.listen(config.get('port'), () => console.log('server started'))

module.exports = app

