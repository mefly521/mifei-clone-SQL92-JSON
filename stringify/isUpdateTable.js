var isTableName = require('../util/isTableName')

/**
 * Check that expression is a UPDATE
 *
 * {
 *   'UPDATE': 'mytable'
 * } => true
 *
 * @param {Object} json
 * @returns {Boolean}
 */

function isUpdateTable (json) {
  var tableName = json['UPDATE'] || json['update']

  if (!tableName) return false

  return isTableName(tableName)
}

module.exports = isUpdateTable
