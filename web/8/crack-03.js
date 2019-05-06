const got = require('got')

async function verify (iv, cipher) {
  let response = await got('http://116.85.48.104:5023/api/account_info', {
    headers: {
      host: 'c1n0h7ku1yw24husxkxxgn3pcbqu56zj.ddctf2019.com',
      cookie: `token=${Buffer.concat([iv, cipher]).toString('base64')}`,
    },
  })
  return response.body
}

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

const ORIGINAL_TOKEN = 'UGFkT3JhY2xlOml2L2NiY8O+7uQmXKFqNVUuI9c7VBe42FqRvernmQhsxyPnvxaF'
const ORIGINAL_IV = Buffer.from(ORIGINAL_TOKEN, 'base64').slice(0, 16)
const ORIGINAL_CIPHER = Buffer.from(ORIGINAL_TOKEN, 'base64').slice(16)

const pad = require('left-pad')
const ALL_HEX = Array.from(Array(256)).map((v, i) => pad(i.toString(16), 2, 0))
// <- ['00', '01', ... 'fe', 'ff']

;(async () => {
  let cipher = replace(ORIGINAL_CIPHER, 15, Buffer.from('11', 'hex'))
  for (let i = 0; i < ALL_HEX.length; i++) {
    let hex = ALL_HEX[i]
    console.log(`0x${hex}`, await verify(ORIGINAL_IV, replace(cipher, 14, Buffer.from(hex, 'hex'))))
  }
})()
