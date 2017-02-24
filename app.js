import Koa from 'koa'
import config from 'config'
import cors from 'kcors';
import bodyParser from 'koa-bodyparser';
import log4js from 'log4js'
import path from 'path'
import logger from './logger'
import router from './routes'

const app = new Koa()
const appDir = path.resolve(__dirname, '.')
const logDir = path.join(appDir, 'logs')
log4js.configure(config.get('config.logger'), { cwd: logDir })

app
    .use(cors({credentials: true}))
    .use(async (ctx, next) => {
        try {
            const start = new Date()
            await next();
            const ms = new Date() - start
            logger.info('%s %s - %s ms', ctx.method,ctx.url, ms)
        } catch (error) {
            ctx.body = JSON.stringify({
                status:"error",
                message:{
                    content: String(error),
                    displayAs:"modal"
                }
            });
            ctx.status = error.status || 500
            logger.error('%s %s - %s', ctx.method,ctx.url, String(error))
        }
    })
    .use(bodyParser({
        onerror(error, ctx) {
            ctx.throw(`cannot parse request body, ${JSON.stringify(error)}`, 400);
        }
    }))
    .use(router.routes());

app.listen(config.get('config.port'), () => console.log('server started'))

export default app

