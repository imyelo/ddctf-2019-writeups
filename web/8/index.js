const got = require('got')
const pAll = require('p-all')
const pad = require('left-pad')
const delay = require('delay')

const TOKEN = 'UGFkT3JhY2xlOml2L2NiY8O+7uQmXKFqNVUuI9c7VBe42FqRvernmQhsxyPnvxaF'
const ALL_HEX = Array.from(Array(256)).map((v, i) => pad(i.toString(16), 2, 0))
const BLOCK_SIZE = 16
const THROTTLE = 100

const MESSAGE_DECRYPT_ERR = 'decrypt err~'


/**
 * e.g.:
 * ```
 * xor('2a', '01')
 * // '2b'
 * ```
 *
 */
function xor (x, y) {
  return (parseInt(x, 16) ^ parseInt(y, 16)).toString(16)
}

/**
 * e.g.:
 * ```
 * getIntermediary('2a', '01')
 * // '+'
 * ```
 *
 */
function getIntermediary (iv, decrypted) {
  const xor = (x, y) => (parseInt(x, 16) ^ parseInt(y, 16)).toString(16)
  return Buffer.from(xor(iv, decrypted), 'hex').toString()
}

/**
 * e.g.:
 * ```
 * replace(Buffer.from('abcd'), 1, '7879')
 * // 'axyd'
 * replace(Buffer.from('abcd'), -2, '7879')
 * // 'abxy'
 */
function replace (buf, pos, hex) {
  let len = hex.length / 2
  let end = pos + len
  if (pos < 0) {
    return replace(buf, buf.length + pos, hex)
  }
  if (end > buf.length) {
    throw new Error('The replacement will overflow.')
  }
  return buf.fill(hex, pos, end, 'hex')
}

async function verify (token) {
  let response = await got('http://116.85.48.104:5023/api/account_info', {
    headers: {
      host: 'c1n0h7ku1yw24husxkxxgn3pcbqu56zj.ddctf2019.com',
      cookie: `token=${token}`,
    },
    retry: 5,
  })
  return response.body
}

async function findPadding (buf, position) {
  let results = {}
  await pAll(ALL_HEX.map((hex) => async () => {
    let modified = replace(buf, position, hex)
    // console.log('Modify [%d] to %s', position, hex)
    // console.log('Modified Result:', modified)
    let message = await verify(modified.toString('base64'))
    message = message.trim()
    console.log('Replacement Hex: %s\nResult:%s\n---', hex, message)
    // if (message !== MESSAGE_DECRYPT_ERR) {
    //   console.log('!-- AVAILABLE CHAR FOUND: 0x%s at %d --!', hex, position)
    // }
    results[message] = (results[message] || []).concat(hex)
    await delay(THROTTLE)
  }), { concurrency: 1 })
  console.log('Result:', results)
  return results
}

async function main () {
  let buf = Buffer.from(TOKEN, 'base64')
  console.log('Buffer: %s\n(Hex: %s)\nLength: %d\nBlock: %d\n(Block size: %d)', buf, buf.toString('hex'), buf.length, buf.length / BLOCK_SIZE, BLOCK_SIZE)
  const find = async (block, index) => {
    const position =  BLOCK_SIZE * block + index
    console.log('Original Hex:', buf[position].toString(16))
    return await findPadding(buf, position)
  }
  find(2, 15)

  // await request(TOKEN)
  // let buf = Buffer.from(TOKEN, 'base64')
  // console.log(buf.toString('utf8'))
  // console.log(buf.toString('utf8').length)
  // console.log(buf.toString('hex'))
  // console.log(buf.toString('hex').length)
}

main()
