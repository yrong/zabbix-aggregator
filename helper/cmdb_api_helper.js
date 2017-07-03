var config=require('config');
var cmdb_api_config = config.get('cmdb');
var rp = require('request-promise');
var querystring = require('querystring');

var apiInvokeFromCmdb= function(path,params){
    var options = {
        method: 'GET',
        uri: cmdb_api_config.base_url + path + (params?('/?' + querystring.stringify(params)):''),
        json: true
    }
    return rp(options)
}

module.exports = {
    apiInvokeFromCmdb,
    getITServices:(params)=>{return apiInvokeFromCmdb('/api/it_services/service',params)},
    getITServiceGroups:()=>{return apiInvokeFromCmdb('/api/it_services/group')}
}