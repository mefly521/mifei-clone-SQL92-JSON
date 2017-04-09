var error = require('../error')

var isKeyword = require('../util/isKeyword')
var isStringNumber = require('../util/isStringNumber')
var isTableName = require('../util/isTableName')

var isAs = isKeyword('AS')
var isCount = isKeyword('COUNT')
var isFrom = isKeyword('FROM')
var isLimit = isKeyword('LIMIT')
var isOffset = isKeyword('OFFSET')
var isSelect = isKeyword('SELECT')
var isWhere = isKeyword('WHERE')

var whereCondition = require('./whereCondition')

/**
 * Parse and serialize a SELECT statement.
 *
 * @params {Array} tokens
 * @params {Array} [sql] used to raise errors, if any
 *
 * @returns {Object} json that serialize the SQL statement.
 */

function select (tokens, sql) {
  var json = { SELECT: [] }

  var countExpression

//  var afterNextToken
  var currentToken
  var firstToken = tokens[0]
  var foundRightParenthesis = false
  var nextToken
  var numTokens = tokens.length
  var subQueryTokens
  var token

  var i
  var j

  var foundFrom = false
  var foundLimit = false
  var foundOffset = false
  var foundWhere = false

  var fromIndex
  // var havingIndex
  // var groupByIndex
  var limitIndex
  var offsetIndex
  // var orderByIndex
  var whereIndex

  if (!isSelect(firstToken)) throw error.invalidSQL(sql)

  // SELECT
  // ////////////////////////////////////////////////////////////////////////

  for (i = 1; i < numTokens; i++) {
    if (foundFrom) continue

    token = tokens[i]

    if (token === ',') continue

    if (isFrom(token)) {
      foundFrom = true
      fromIndex = i
    } else {
      if (isStringNumber(token)) {
        json.SELECT.push(parseFloat(token))
        continue
      }

      if (isCount(token)) {
        foundRightParenthesis = false
        countExpression = {}

        nextToken = tokens[i + 1]
        if (nextToken !== '(') throw error.invalidSQL(sql)

        for (j = i + 1; j < numTokens; j++) {
          currentToken = tokens[j]
          nextToken = tokens[j + 1]

          if (currentToken === ')') {
            foundRightParenthesis = true

            if (isAs(nextToken)) {
              countExpression.AS = tokens[j + 2]
              i = j + 2
            } else {
              i = j
            }

            break
          }

          // TODO complex count expressions
          if (isStringNumber(currentToken)) {
            countExpression.COUNT = parseFloat(currentToken)
          } else {
            countExpression.COUNT = currentToken
          }
        }

        if (!foundRightParenthesis) throw error.invalidSQL(sql)

        json.SELECT.push(countExpression)

        continue
      }

      json.SELECT.push(token)
    }
  }

  // FROM
  // //////////////////////////////////////////////////////////////////////

  if (foundFrom) {
    json.FROM = []

    for (i = fromIndex + 1; i < numTokens; i++) {
      token = tokens[i]

      if (token === ',') continue

      if (token === '(') {
        // A sub query must start with a SELECT.
        firstToken = tokens[i + 1]
        if (!isSelect(firstToken)) throw error.invalidSQL(sql)

        foundRightParenthesis = false
        subQueryTokens = []

        for (j = i + 1; j < numTokens; j++) {
          token = tokens[j]

          if (token === ')') {
            foundRightParenthesis = true
            i = j
            json.FROM.push(select(subQueryTokens, sql))
          } else {
            subQueryTokens.push(token)
          }
        }

        if (foundRightParenthesis) {
          foundRightParenthesis = false
        } else {
          throw error.invalidSQL(sql)
        }
      }

      if (isTableName(token)) {
        json.FROM.push(token)
      }

      if (isWhere(token)) {
        foundWhere = true
        whereIndex = i
        json.WHERE = []
        break
      }

      // TODO if (isOrderBy(token)) {

      // if (isKeyword(token)) break
    }

    // WHERE
    // ////////////////////////////////////////////////////////////////////

    if (foundWhere) {
      // After a WHERE there should be at least one condition and it will
      // have more al least 3 tokens: leftOperand, operator, rightOperand.
      if (whereIndex === numTokens - 3) throw error.invalidSQL(sql)

      json.WHERE = whereCondition(tokens, whereIndex, select, sql)
    }

    // LIMIT
    // ////////////////////////////////////////////////////////////////////

    for (i = fromIndex; i < numTokens; i++) {
      if (foundLimit) continue

      token = tokens[i]

      if (isLimit(token)) {
        foundLimit = true
        limitIndex = i
      }
    }

    if (foundLimit) {
      if (limitIndex === numTokens - 1) throw error.invalidSQL(sql)

      var limitValue = tokens[limitIndex + 1]

      if (isStringNumber(limitValue)) {
        limitValue = parseFloat(limitValue)

        if (limitValue >= 0) json.LIMIT = limitValue
        else throw error.invalidSQL(sql)
      } else {
        throw error.invalidSQL(sql)
      }
    }

    // OFFSET
    // ////////////////////////////////////////////////////////////////////

    for (i = fromIndex; i < numTokens; i++) {
      if (foundOffset) continue

      token = tokens[i]

      if (isOffset(token)) {
        foundOffset = true
        offsetIndex = i
      }
    }

    if (foundOffset) {
      if (offsetIndex === numTokens - 1) throw error.invalidSQL(sql)

      var offsetValue = tokens[offsetIndex + 1]

      if (isStringNumber(offsetValue)) {
        offsetValue = parseFloat(offsetValue)

        if (offsetValue >= 0) json.OFFSET = offsetValue
        else throw error.invalidSQL(sql)
      } else {
        throw error.invalidSQL(sql)
      }
    }
  }

  return json
}

module.exports = select
