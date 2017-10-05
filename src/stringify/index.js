var conditions = require('./conditions')
var groupByCondition = require('./groupByCondition')
var hasFrom = require('./hasFrom')
var hasLimit = require('./hasLimit')
var hasOffset = require('./hasOffset')
var hasGroupBy = require('./hasGroupBy')
var hasHaving = require('./hasHaving')
var hasOrderBy = require('./hasOrderBy')
var hasUnion = require('./hasUnion')
var hasUnionAll = require('./hasUnionAll')
var hasWhere = require('./hasWhere')
var orderByCondition = require('./orderByCondition')
var isCreateTable = require('./isCreateTable')
var isSelect = require('./isSelect')
var resultSet = require('./resultSet')
var selectField = require('./selectField')

/**
 * Convert JSON to SQL.
 *
 * @param {Object} json
 *
 * @returns {String} sql
 */

function stringify (json) {
  var sql

  if (isCreateTable(json)) {
    sql = 'CREATE TABLE ' + json['CREATE TABLE'].name + ' ('

    json['CREATE TABLE'].fields.forEach(function (field, index, fields) {
      sql += field[0] + ' ' + field[1]

      if (index === fields.length - 1) {
        sql += ')'
      } else {
        sql += ', '
      }
    })
  }

  if (isSelect(json)) {
    if (sql) sql += ' SELECT '
    else sql = 'SELECT '

    if (json.DISTINCT) sql += 'DISTINCT '

    sql += json.SELECT.map(selectField).join(', ')

    if (hasFrom(json)) {
      sql += ' FROM ' + json.FROM.map(resultSet(stringify)).join(' ')
    }

    if (hasWhere(json)) {
      sql += ' WHERE ' + conditions(stringify)(json.WHERE)
    }

    if (hasGroupBy(json)) {
      sql += ' GROUP BY ' + json['GROUP BY'].map(groupByCondition).join(', ')

      if (hasHaving(json)) {
        sql += ' HAVING ' + conditions(stringify)(json.HAVING)
      }
    }

    if (hasOrderBy(json)) {
      sql += ' ORDER BY ' + json['ORDER BY'].map(orderByCondition).join(', ')
    }

    if (hasLimit(json)) {
      sql += ' LIMIT ' + json.LIMIT
    }

    if (hasOffset(json)) {
      sql += ' OFFSET ' + json.OFFSET
    }

    if (hasUnion(json)) {
      sql += ' UNION ' + stringify(json.UNION)
    }

    if (hasUnionAll(json)) {
      sql += ' UNION ALL ' + stringify(json['UNION ALL'])
    }
  }

  return sql
}

module.exports = stringify
