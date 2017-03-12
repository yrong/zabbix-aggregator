import alias from './alias'
const HistoryTable = ['history','history_str','history_log','history_uint','history_text']

const getHistoryTableName = (type)=>HistoryTable[type]

const sqlGetLatestItemValueInHistory = (type,itemid)=>{
    let tableName = getHistoryTableName(type)
    let sql = `SELECT value FROM ${tableName} h WHERE h.itemid=${itemid} ORDER BY h.clock DESC limit 1;`
    return sql
}

const sqlGetItemTimeSpan = (type, itemid) =>{
    let tableName = getHistoryTableName(type)
    let sql = `SELECT min(clock) as ${alias.history_clock_min_alias},max(clock) as ${alias.history_clock_max_alias} FROM ${tableName} h WHERE h.itemid=${itemid}`
    return sql
}

const sqlGetValuesWithinTimeRange = (type,itemid,since,until) =>{
    let tableName = getHistoryTableName(type)
    let sql = `SELECT value,clock FROM ${tableName} h WHERE h.itemid=${itemid} and h.clock>${since} and h.clock<${until}`
    return sql
}

export {sqlGetLatestItemValueInHistory,sqlGetItemTimeSpan,sqlGetValuesWithinTimeRange}
