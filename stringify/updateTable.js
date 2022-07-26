var conditions = require('./conditions')
var hasWhere = require('./hasWhere')
var select = require('./select')
var select = require('./select')

function updateFrom (json) {
  let tableName = json['UPDATE'] || json['update']

  let sql = `UPDATE ${tableName} SET `
  let tableFields = json['FIELDS'] || json['fields']
  if (tableFields) {
    tableFields.forEach(function (field, index, fields) {
      sql += ` ${field.name} = '${field.value}',`
    })
    sql = sql.substr(0,sql.length-1)
  }

  if (json.WHERE) {
    if (hasWhere(json)) {
      sql += ' WHERE ' + conditions(select)(json.WHERE)
    }
  }

  return sql
}

module.exports = updateFrom
