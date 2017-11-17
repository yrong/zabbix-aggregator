const Koa = require('koa')
const config = require('config')
const cors = require('kcors')
const bodyParser = require('koa-bodyparser')
const logger = require('log4js_wrapper')
logger.initialize(config.get('logger'))
const app = new Koa()
const middleware = require('./middleware')
const router = require('./routes')


app
    .use(cors({credentials: true}))
    .use(bodyParser())
    .use(middleware())
    .use(router.routes());

app.listen(config.get('scmpz.port'), () => console.log('server started'))

process.on('uncaughtException', (err) => {
    logger.error(`Caught exception: ${err}`)
})

