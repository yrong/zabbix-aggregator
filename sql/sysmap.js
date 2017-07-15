
const sqlGetSysMaps = ()=>{
    return `select * from sysmaps`
}

const sqlGetHostElementsInSysMap = (sysmapid)=>{
    return `SELECT hosts.host,se.* FROM sysmaps_elements se inner join hosts where hosts.hostid=se.elementid and elementtype=0 and se.sysmapid=${sysmapid}`
}

const sqlGetLinksInSysMap = (sysmapid)=>{
    return `SELECT * FROM sysmaps_links where sysmapid=${sysmapid}`
}

const sqlGetLinkTriggersInSysMap = (sysmapid)=>{
    return `SELECT * FROM sysmaps_link_triggers slt inner join triggers where triggers.triggerid=slt.triggerid`
}

module.exports = {sqlGetSysMaps,sqlGetHostElementsInSysMap,sqlGetLinksInSysMap,sqlGetLinkTriggersInSysMap}
