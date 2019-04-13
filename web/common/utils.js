const base64 = {
  encode (str, encoding = 'utf8') {
    let buf = new Buffer(str, encoding)
    return buf.toString('base64')
  },
  decode (str, encoding = 'utf8') {
    let buf = new Buffer(str, 'base64')
    return buf.toString(encoding)
  }
}

const ascii = {
  decode (str) {
    let output = ''
    for (let index = 0; index < str.length; index += 2) {
      output = output + String.fromCharCode(parseInt(str.slice(index, index + 2), 16))
    }
    return output
  },
  encode (str) {
    let output = ''
    for (let index = 0; index < str.length; index++) {
      output = output + str.charCodeAt(index).toString(16)
    }
    return output
  },
}

exports.base64 = base64
exports.ascii = ascii