import Koa from 'koa'
import config from 'config'
import cors from 'kcors';
import bodyParser from 'koa-bodyparser';
import log4js from 'log4js'
import path from 'path'
import router from './routes'
import middleware from './middleware'
const app = new Koa()
const appDir = path.resolve(__dirname, '.')
const logDir = path.join(appDir, 'logs')
log4js.configure(config.get('config.logger'), { cwd: logDir })

app
    .use(cors({credentials: true}))
    .use(bodyParser({
        onerror(error, ctx) {
            ctx.throw(`cannot parse request body, ${JSON.stringify(error)}`, 400);
        }
    }))
    .use(middleware())
    .use(router.routes());

app.listen(config.get('config.port'), () => console.log('server started'))

export default app

