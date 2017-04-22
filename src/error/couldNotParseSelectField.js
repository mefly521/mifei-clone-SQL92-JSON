function couldNotParseSelectField (field) {
  var message = 'Could not parse select field'
  if (field) message = message + ' ' + field

  var error = new TypeError(message)
  error.field = field

  return error
}

module.exports = couldNotParseSelectField
