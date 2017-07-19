
const alias = require('./alias')
const TrendsTable = {0:'trends',3:'trends_uint'}

const getTrendsTableName = (type)=>TrendsTable[type]

const sqlGetValuesWithinTimeRange = (type, itemid, since, until)=>{
    let tableName = getTrendsTableName(type)
    let sql = `SELECT value_avg as ${alias.history_value_alias},clock as ${alias.history_clock_alias} FROM ${tableName} h WHERE h.itemid=${itemid} and h.clock>${since} and h.clock<${until}`
    return sql
}

module.exports = {sqlGetValuesWithinTimeRange}
