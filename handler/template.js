
'use strict';

const Router = require('koa-router')
const _ = require('lodash')
const Model = require('redis-crud-fork')
const TemplateModel = Model('Template')

let template = new Router();

template.post('/', async (ctx, next)=>{
    let params = ctx.request.body
    let template_id = await TemplateModel.insert(params)
    ctx.body = {template_id}
});

template.get('/', async (ctx)=>{
    let results = await TemplateModel.findAll()
    ctx.body = results
});

template.get('/:template_id', async (ctx)=>{
    let template_id = ctx.params.template_id
    let result = await TemplateModel.get(template_id)
    ctx.body = result
});

template.del('/:template_id', async (ctx)=>{
    let template_id = ctx.params.template_id,result
    result = await TemplateModel.delete(template_id)
    ctx.body = result
});

template.del('/', async (ctx)=>{
    let result = await TemplateModel.deleteAll()
    ctx.body = result
});

template.put('/:template_id',async(ctx)=>{
    let template_id = ctx.params.template_id
    let result = await TemplateModel.update(template_id,ctx.request.body)
    ctx.body = result
})


module.exports = template
