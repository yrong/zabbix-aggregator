'use strict';

import Router from 'koa-router';
import {triggers,items,hosts,groups} from '../handler';

const router = new Router();

router.use('/api/triggers',  triggers.routes(),triggers.allowedMethods())

router.use('/api/items',  items.routes(),items.allowedMethods())

router.use('/api/hosts',  hosts.routes(),hosts.allowedMethods())

router.use('/api/groups',  groups.routes(),groups.allowedMethods())

router.get('*', async (ctx, next) => {
    ctx.body = { status : 404 }
})

export default router
