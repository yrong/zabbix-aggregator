const Koa = require('koa')
const config = require('config')
const cors = require('kcors')
const bodyParser = require('koa-bodyparser')
const app = new Koa()
const middleware = require('./middleware')
const router = require('./routes')

const log4js_wrapper = require('log4js-wrapper-advanced')
log4js_wrapper.initialize(Object.assign({}, config.get('logger')))
const logger = log4js_wrapper.getLogger()


app
    .use(cors({credentials: true}))
    .use(bodyParser())
    .use(middleware())
    .use(router.routes());

app.listen(config.get('scmpz.port'), () => logger.info('server started'))

process.on('uncaughtException', (err) => {
    logger.error(`Caught exception: ${err}`)
})

