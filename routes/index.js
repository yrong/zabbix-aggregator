'use strict';

import Router from 'koa-router';
import {triggers} from '../handler';

const router = new Router();

router.use('/api/triggers',  triggers.routes(),triggers.allowedMethods())

router.get('*', async (ctx, next) => {
    ctx.body = { status : 404 }
})

export default router
