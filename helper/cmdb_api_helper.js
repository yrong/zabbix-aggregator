const config=require('config')
const common = require('scirichon-common')

const apiInvokeFromCmdb= function(path,params){
    return common.apiInvoker('GET',`http://${config.get('privateIP')||'localhost'}:${config.get('cmdb.port')}`,path,params)
}

module.exports = {
    apiInvokeFromCmdb
}