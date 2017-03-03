const rp = require('request-promise')
const config = require('config')
const queryString = require('query-string')
const _ = require('lodash')
const assert = require('chai').assert

const json_option = {json: true}
const get_options = _.assign({method: 'GET'},json_option)
const post_options = _.assign({method: 'POST'},json_option)

const generateUri = (base_url, path, params)=> {return {uri: base_url + path + (params?('/?' + queryString.stringify(params)):'')}}

const apiGet = (base_url, path, params)=>{
    return rp(_.assign(generateUri(base_url, path, params),get_options))
}

const apiPost = (base_url,path,body,params)=>{
    return rp(_.assign(generateUri(base_url, path, params),post_options,{body:body}))
}

const legacy_url = config.get('config.legacy_url')
const url = `http://localhost:${config.get('config.port')}/api`

const convert_integer_2_string = (obj)=>{
    for (var key in obj)
    {
        if (_.isNumber(obj[key]))
            obj[key] = String(obj[key]);
        else if(_.isObject(obj[key]))
            obj[key] = convert_integer_2_string(obj[key])
    }
    return obj
}

const compare = (values,done)=>{
    let result_new = values[0]
    let result_legacy = values[1]
    try{
        assert.deepEqual((result_new),result_legacy)
        done()
    }catch(err){
        done(err)
    }
}


describe('scmp-z test cases', function() {
    this.timeout(2000)
    describe('/api/triggers', function() {
        it('/group', function (done) {
            Promise.all([apiGet(url, '/triggers/group'),apiGet(legacy_url, '/triggers/group')]).then(values=>{
                compare(values,done)
            })
        });
        it('/active', function (done) {
            Promise.all([apiGet(url, '/triggers/active'),apiGet(legacy_url, '/triggers/active')]).then(values=>{
                compare(values,done)
            })
        });
        it('/active/:group', function (done) {
            Promise.all([apiGet(url, `/triggers/active/${encodeURIComponent('Storage')}`),apiGet(legacy_url, `/triggers/active/${encodeURIComponent('Storage')}`)]).then(values=>{
                compare(values,done)
            })
        });
    })
    describe('/api/items/search', function() {
        it('/search/Exchange Mailbox Database', function (done) {
            let body = {
                "appName":"Exchange Mailbox Database",
                "hosts":["AS-3650-EXCDB-1","AS-3650-EXCDB-2","AS-VME-EXCCAS-1","BJ-X3650-EXC-1"],
                "items":["Exchange Mailbox Database ==> Instances(*) I/O Database Reads Average Latency",
                    "Exchange Mailbox Database ==> Instances(*) I/O Database Writes Average Latency",
                    "Exchange Mailbox Database Log Bytes Write/sec","Exchange Mailbox Database Log Record Stalls/sec",
                    "Exchange Mailbox Database Log Threads Waiting"],
                "transposed":0,
                "title": null
            }
            Promise.all([apiPost(url,'/items/search',body),apiGet(legacy_url, `/group/${encodeURIComponent('Exchange Mailbox Database')}`)]).then(values=>{
                compare(values,done)
            })
        });
        it('/search/Windows Servers', function (done) {
            let body = {
                "appName":"Windows Servers"
            }
            Promise.all([apiPost(url,'/items/search',body),apiGet(legacy_url, `/group/${encodeURIComponent('Windows Servers')}`)]).then(values=>{
                compare(values,done)
            })
        });
    })
});