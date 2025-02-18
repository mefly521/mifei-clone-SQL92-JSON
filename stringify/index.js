var isCreateTable = require('./isCreateTable')
var isDeleteFrom = require('./isDeleteFrom')
var isDropTable = require('./isDropTable')
var isSelect = require('./isSelect')
var isUpdateTable = require('./isUpdateTable')
var isInsertTable = require('./isInsertTable')

var insertTable = require('./insertTable')
var createTable = require('./createTable')
var updateTable = require('./updateTable')
var deleteFrom = require('./deleteFrom')
var dropTable = require('./dropTable')
var select = require('./select')

/**
 * Convert JSON to SQL.
 *
 * @param {Object} json
 *
 * @returns {String} sql
 */

function stringify (json) {
  var sql = ''

  if (isUpdateTable(json)) {
    return updateTable(json)
  }

  if (isInsertTable(json)) {
    return insertTable(json)
  }

  if (isDeleteFrom(json)) {
    return deleteFrom(json)
  }

  if (isDropTable(json)) {
    return dropTable(json)
  }

  if (isCreateTable(json, stringify)) {
    sql = createTable(json, stringify)
  }

  if (isSelect(json)) {
    // A SELECT statement could be a continuation of an INSERT,
    // or a CREATE TABLE foo AS, so it is necessary to add a
    // space separator in between.
    if (sql !== '') sql += ' '

    sql += select(json, sql)
  }

  return sql
}

module.exports = stringify
