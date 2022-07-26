var conditions = require('./conditions')
var hasWhere = require('./hasWhere')
var select = require('./select')
var select = require('./select')

function insert (json) {
  let tableName = json['INSERT'] || json['insert']

  let tableFields = json['FIELDS'] || json['fields']
  let fields = ""
  let values = ""
  if (tableFields) {
    tableFields.forEach(function (field) {
      fields += ` ${field.name} ,`
      values += ` '${field.value}',`
    })
    fields = fields.substr(0,fields.length-1)
    values = values.substr(0,values.length-1)
  }

  let sql = `INSERT INTO ${tableName} (${fields}) VALUES (${values}) `
  return sql
}

module.exports = insert
