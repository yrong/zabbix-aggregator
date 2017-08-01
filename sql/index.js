const Zabbix_Template_Name_keyword='Templates',Zabbix_Group_Name_Keyword='zabbix'
const wherePartExcludeZabbixGroup = `groups.name not like "%${Zabbix_Group_Name_Keyword}%" and groups.name != "${Zabbix_Template_Name_keyword}"`

const sqlFindWithFieldsAndWhere = (fields,table,join,where,pagination)=> {
    let sql = `select ${fields} from ${table}`,page,per_page,from,to
    if(join)
        sql = `${sql} ${join}`
    if(where)
        sql = `${sql} WHERE ${where}`
    if(pagination){
        page = parseInt(pagination.page)-1
        per_page = parseInt(pagination.per_page) || 1000
        from = page * per_page
        sql = `${sql} LIMIT ${from},${per_page}`
    }
    return sql
}

module.exports = {sqlFindWithFieldsAndWhere,wherePartExcludeZabbixGroup}