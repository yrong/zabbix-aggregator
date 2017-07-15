'use strict';

const Router = require('koa-router')
const {triggers,items,hosts,groups,template,sysmap} = require('../handler')

const router = new Router();

router.use('/api/triggers',  triggers.routes(),triggers.allowedMethods())

router.use('/api/items',  items.routes(),items.allowedMethods())

router.use('/api/hosts',  hosts.routes(),hosts.allowedMethods())

router.use('/api/groups',  groups.routes(),groups.allowedMethods())

router.use('/api/templates',  template.routes(),template.allowedMethods())

router.use('/api/sysmaps',  sysmap.routes(),sysmap.allowedMethods())

router.get('*', async (ctx, next) => {
    ctx.body = { status : 404 }
})

module.exports = router
