const config=require('config');
const cmdb_api_config = config.get('cmdb');
const common = require('scirichon-common')

const apiInvokeFromCmdb= function(path,params){
    return common.apiInvoker('GET',cmdb_api_config.base_url,path,params)
}

module.exports = {
    apiInvokeFromCmdb,
    getITServiceGroups:()=>{return apiInvokeFromCmdb('/api/it_services/group')}
}