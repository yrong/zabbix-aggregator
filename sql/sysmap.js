
const sqlGetSysMaps = ()=>{
    return `select * from sysmaps`
}

const sqlGetElementsInSysMap = (sysmapid)=>{
    return `SELECT hosts.name,se.* FROM sysmaps_elements se inner join hosts where hosts.hostid=se.elementid and elementtype=0 and se.sysmapid=${sysmapid}
    union all SELECT '' as name,se.* FROM sysmaps_elements se where elementtype=4 and se.sysmapid=${sysmapid}`
}

const sqlGetLinksInSysMap = (sysmapid)=>{
    return `SELECT * FROM sysmaps_links where sysmapid=${sysmapid}`
}

const sqlGetLinkTriggersInSysMap = (sysmapid)=>{
    return `SELECT triggers.value,slt.* FROM sysmaps_link_triggers slt inner join triggers where triggers.triggerid=slt.triggerid`
}

module.exports = {sqlGetSysMaps,sqlGetElementsInSysMap,sqlGetLinksInSysMap,sqlGetLinkTriggersInSysMap}
