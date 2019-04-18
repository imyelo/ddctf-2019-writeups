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

exports.base64 = base64
