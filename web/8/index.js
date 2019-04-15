const got = require('got')
const pAll = require('p-all')

const TOKEN = 'UGFkT3JhY2xlOml2L2NiY8O+7uQmXKFqNVUuI9c7VBe42FqRvernmQhsxyPnvxaF'

function replace (str, pos, char) {
  if (pos < 0) {
    return replace(str, str.length + pos, char)
  }
  return `${str.slice(0, pos)}${char}${str.slice(pos + 1)}`
}

async function verify (token) {
  let response = await got('http://116.85.48.104:5023/api/account_info', {
    headers: {
      host: 'c1n0h7ku1yw24husxkxxgn3pcbqu56zj.ddctf2019.com',
      cookie: `token=${token}`,
    },
  })
  return response.body
}

async function findPadding (hex, position) {
  let chars = '0123456789abcdef'.split('')
  await pAll(chars.map((char) => async () => {
    let modified = replace(hex, position, char)
    let result = await verify(Buffer.from(modified, 'hex').toString('base64'))
    console.log('Char: %s\nResult:%s\n---', char, result)
  }), { concurrency: 1 })
}

async function main () {
  let buf = Buffer.from(TOKEN, 'base64')
  let hex = buf.toString('hex')
  console.log('Hex: %s\nLength: %d\nBlock: %d', hex, hex.length, hex.length / 16)
  await findPadding(replace(hex, -1, '5'), -2)

  // await request(TOKEN)
  // let buf = Buffer.from(TOKEN, 'base64')
  // console.log(buf.toString('utf8'))
  // console.log(buf.toString('utf8').length)
  // console.log(buf.toString('hex'))
  // console.log(buf.toString('hex').length)
}

main()
