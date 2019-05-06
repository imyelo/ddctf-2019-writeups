const got = require('got')

const ORIGINAL_TOKEN = 'UGFkT3JhY2xlOml2L2NiY8O+7uQmXKFqNVUuI9c7VBe42FqRvernmQhsxyPnvxaF'
const ORIGINAL_IV = Buffer.from(ORIGINAL_TOKEN, 'base64').slice(0, 16)
const ORIGINAL_CIPHER = Buffer.from(ORIGINAL_TOKEN, 'base64').slice(16)

const DECRYPT_ERROR = 'decrypt err~'

async function challenge (iv, cipher) {
  let response = await got('http://116.85.48.104:5023/api/account_info', {
    headers: {
      host: 'c1n0h7ku1yw24husxkxxgn3pcbqu56zj.ddctf2019.com',
      cookie: `token=${Buffer.concat([iv, cipher]).toString('base64')}`,
    },
  })
  return response.body.trim() !== DECRYPT_ERROR
}

const log = require('log-update')
const pad = require('left-pad')
const ALL_HEX = Array.from(Array(256)).map((v, i) => pad(i.toString(16), 2, 0))
// <- ['00', '01', ... 'fe', 'ff']

function replace (buf, position, replacement) {
  let end = position + replacement.length
  if (position < 0) {
    return replace(buf, buf.length + position, replacement)
  }
  if (end > buf.length) {
    throw new Error('The replacement will cause the result to overflow.')
  }
  return Buffer.from(buf).fill(replacement, position, end)
}

;(async () => {
  let SIZE = ORIGINAL_IV.length
  let intermediary = Buffer.alloc(ORIGINAL_CIPHER.length)
  
  console.log('--- Crack intermediary value of block 1 ---')

  for (let padding = 1; padding <= SIZE; padding++) {
    console.log('Intermediary value:', intermediary.toString('hex'))
    console.log('Current padding:', padding)

    let cipher = ORIGINAL_CIPHER
    let found

    for (let i = 1; i < padding; i++) {
      cipher = replace(cipher, SIZE - i, Buffer.from([padding ^ intermediary[ORIGINAL_CIPHER.length - i]]))
    }
    
    for (let i = 0; i < ALL_HEX.length; i++) {
      let hex = ALL_HEX[i]
      let sample = replace(cipher, SIZE - padding, Buffer.from(hex, 'hex'))
      if (sample.equals(ORIGINAL_CIPHER)) {
        log('valid (backup):', `0x${hex}`)
        found = hex
        continue
      }
      if (await challenge(ORIGINAL_IV, sample)) {
        log('valid:', `0x${hex}`)
        found = hex
        break
      }
      log('invalid:', `0x${hex}`)
    }
    if (!found) {
      throw new Error('All the challenges failed.')
    }
    intermediary[ORIGINAL_CIPHER.length - padding] = padding ^ parseInt(found, 16)
    log.done()
  }
  console.log('Intermediary value:', intermediary.toString('hex'))
})()
