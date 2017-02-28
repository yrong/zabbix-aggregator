const HistoryTable = ['history','history_str','history_log','history_uint','history_text']

const getHistoryTableName = (type)=>HistoryTable[type]

const sqlGetLatestItemValueInHistory = (type,itemid)=>{
    let tableName = getHistoryTableName(type)
    let sql = `SELECT * FROM ${tableName} h WHERE h.itemid=${itemid} ORDER BY h.clock DESC limit 1;`
    return sql
}

export {sqlGetLatestItemValueInHistory}
