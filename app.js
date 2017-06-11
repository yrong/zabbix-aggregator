const Koa = require('koa')
const config = require('config')
const cors = require('kcors')
const bodyParser = require('koa-bodyparser')
const log4js = require('log4js')
const path = require('path')
const router = require('./routes')
const middleware = require('./middleware')
const app = new Koa()
const fs = require('fs')
const logDir = path.join('./logs')
if (!fs.existsSync(logDir)){
    fs.mkdirSync(logDir);
}
log4js.configure(config.get('logger'), { cwd: logDir })

app
    .use(cors({credentials: true}))
    .use(bodyParser({
        onerror(error, ctx) {
            ctx.throw(`cannot parse request body, ${JSON.stringify(error)}`, 400);
        }
    }))
    .use(middleware())
    .use(router.routes());

app.listen(config.get('port'), () => console.log('server started'))

module.exports = app

