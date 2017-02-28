const sqlFindWithFieldsAndWhere = (fields,table,join,where)=>`select ${fields} from ${table}
    ${join}
    where ${where}`
    
export {sqlFindWithFieldsAndWhere}