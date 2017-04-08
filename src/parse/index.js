var error = require('../error')
var isComparisonOperator = require('../util/isComparisonOperator')

var isKeyword = require('../util/isKeyword')
var isKeywordOrOperator = require('../util/isKeywordOrOperator')
var isLogicalOperator = require('../util/isLogicalOperator')
var isSetOperator = require('../util/isSetOperator')
var isSingleQuotedString = require('../util/isSingleQuotedString')
var isStringNumber = require('../util/isStringNumber')
var isTableName = require('../util/isTableName')
var tokenize = require('../util/tokenize')

var isAs = isKeyword('AS')
var isCount = isKeyword('COUNT')
var isDrop = isKeyword('DROP')
var isFrom = isKeyword('FROM')
var isDelete = isKeyword('DELETE')
var isInsert = isKeyword('INSERT')
var isLimit = isKeyword('LIMIT')
var isOffset = isKeyword('OFFSET')
var isSelect = isKeyword('SELECT')
var isTruncate = isKeyword('TRUNCATE')
var isUpdate = isKeyword('UPDATE')
var isWhere = isKeyword('WHERE')

var isAnd = isLogicalOperator('AND')
var isOr = isLogicalOperator('OR')

var isIn = isSetOperator('IN')

var comparison = require('./comparison')

/**
 * Convert SQL to JSON.
 *
 * @param {String} sql
 *
 * @returns {Object} json
 */

function parse (sql) {
  var json
  var tokens = tokenize(sql)

  function serialize (json, tokens) {
    var andCondition = null
    var orCondition = null
    var currentCondition = null
    var comparisonExpression
    var countExpression

    var afterNextToken
    var currentToken
    var firstToken = tokens[0]
    var foundRightParenthesis = false
    var nextToken
    var numTokens = tokens.length
    var subQueryTokens
    var token

    var i
    var j

    var leftOperand
    var rightOperand

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

    var firstTokenIsValid = (
      isDelete(firstToken) ||
      isDrop(firstToken) ||
      isInsert(firstToken) ||
      isSelect(firstToken) ||
      isTruncate(firstToken) ||
      isUpdate(firstToken)
    )

    if (!firstTokenIsValid) throw error.invalidSQL(sql)

    // SELECT
    // ////////////////////////////////////////////////////////////////////////

    // TODO separated serializeSelect function.
    if (isSelect(firstToken)) {
      json.SELECT = []

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
                json.FROM.push(serialize({}, subQueryTokens))
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

          for (i = whereIndex; i < numTokens; i++) {
            token = tokens[i]
            nextToken = tokens[i + 1]
            afterNextToken = tokens[i + 2]

            if (isAnd(token)) {
              andCondition = {}
              andCondition.AND = []
            }

            if (isOr(token)) {
              orCondition = {}
              orCondition.OR = []
            }

            if (isComparisonOperator(nextToken)) {
              try {
                comparisonExpression = comparison(token, nextToken, afterNextToken)

                if (andCondition) {
                  andCondition.AND = andCondition.AND.concat(comparisonExpression)
                  json.WHERE = json.WHERE.concat(andCondition)
                } else if (orCondition) {
                  orCondition.OR = orCondition.OR.concat(comparisonExpression)
                  json.WHERE = json.WHERE.concat(orCondition)
                } else {
                  json.WHERE = json.WHERE.concat(comparisonExpression)
                }

                i = i + 1
              } catch (err) {
                throw err
              }
            }

            if (isIn(token)) {
              leftOperand = tokens[i - 1]
              nextToken = tokens[i + 1]
              foundRightParenthesis = false

              if (nextToken !== '(') throw error.invalidSQL(sql)

              if (!afterNextToken) throw error.invalidSQL(sql)

              if (isSelect(afterNextToken)) {
                currentCondition = {}
                subQueryTokens = []

                for (j = i + 2; j < numTokens; j++) {
                  token = tokens[j]

                  if (token === ')') {
                    currentCondition.IN = serialize({}, subQueryTokens)
                    json.WHERE.push(leftOperand, currentCondition)

                    foundRightParenthesis = true
                    i = j
                  } else {
                    subQueryTokens.push(token)
                  }
                }

                if (foundRightParenthesis) {
                  foundRightParenthesis = false
                } else {
                  throw error.invalidSQL(sql)
                }
              } else {
                if (!currentCondition) currentCondition = {}
                rightOperand = []

                if (isKeywordOrOperator(leftOperand)) throw error.invalidSQL(sql)
                if (isStringNumber(leftOperand)) throw error.invalidSQL(sql)

                for (j = i + 2; j < numTokens; j = j + 2) {
                  currentToken = tokens[j]
                  nextToken = tokens[j + 1]

                  if ((nextToken === ',') || (nextToken === ')')) {
                    if (isSingleQuotedString(currentToken)) {
                      // Remove quotes, that are first and last characters.
                      rightOperand.push(currentToken.substring(1, currentToken.length - 1))
                    }

                    if (isStringNumber(currentToken)) {
                      rightOperand.push(parseFloat(currentToken))
                    }

                    // TODO I am not sure if there are other cases,
                    // should I raise an exception here, if token is not
                    // a string or is not a number?
                  }

                  // Clean up, this will be the last iteration so place
                  // the cursor at the right position and remember that
                  // we found a right parenthesis.

                  if (nextToken === ')') {
                    i = j + 1

                    foundRightParenthesis = true

                    break
                  }
                }

                if (!foundRightParenthesis) throw error.invalidSQL(sql)

                currentCondition[token] = rightOperand

                if (andCondition) {
                  andCondition.AND.push(leftOperand, currentCondition)
                  json.WHERE.push(andCondition)
                  andCondition = null
                  currentCondition = null
                  continue
                }

                if (orCondition) {
                  orCondition.OR.push(leftOperand, currentCondition)
                  json.WHERE.push(orCondition)
                  orCondition = null
                  currentCondition = null
                  continue
                }

                json.WHERE.push(leftOperand, currentCondition)
                currentCondition = null
              }
            }
          }
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
  }

  if (tokens.indexOf(';') === -1) {
    json = {}

    return serialize(json, tokens)
  } else {
    json = []

    // TODO consider ';' as a sql statements separator
    // loop over tokens and create an array of queries
    return json
  }
}

module.exports = parse
