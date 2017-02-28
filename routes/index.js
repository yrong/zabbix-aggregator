'use strict';

import Router from 'koa-router';
import {triggers,items} from '../handler';

const router = new Router();

router.use('/api/triggers',  triggers.routes(),triggers.allowedMethods())

router.use('/api/items',  items.routes(),items.allowedMethods())

router.get('*', async (ctx, next) => {
    ctx.body = { status : 404 }
})

export default router
