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

;(async () => {
  console.log(
    '---\nOriginal IV:\n%s\nOriginal Cipher:\n%s\n---',
    Buffer.from(ORIGINAL_IV, 'base64').toString('hex'),
    Buffer.from(ORIGINAL_CIPHER, 'base64').toString('hex')
  )
  // <- ---
  // <- Original IV:
  // <- 5061644f7261636c653a69762f636263
  // <- Original Cipher:
  // <- c3beeee4265ca16a35552e23d73b5417b8d85a91bdeae799086cc723e7bf1685
  // <- ---

  console.log(await verify(ORIGINAL_IV, ORIGINAL_CIPHER))
  // <- {"id":100,"roleAdmin":false}

  console.log(await verify(ORIGINAL_IV, replace(ORIGINAL_CIPHER, 16, Buffer.from('00', 'hex'))))
  // <- decrypt err~ 
})()
