const ORIGINAL_TOKEN = 'UGFkT3JhY2xlOml2L2NiY8O+7uQmXKFqNVUuI9c7VBe42FqRvernmQhsxyPnvxaF'
const BLOCK_1_CIPHER = Buffer.from(ORIGINAL_TOKEN, 'base64').slice(16, 32)
const BLOCK_2_INTERMEDIARY = Buffer.from('a7d3878a0466c70b59264b5ed33f5013', 'hex')

function xor (x, y) {
  if (x.length !== y.length) {
    throw new Error('The length of two buffers is different')
  }
  let z = Buffer.alloc(x.length)
  for (let i = 0; i < z.length; i ++) {
    z[i] = x[i] ^ y[i]
  }
  return z
}

;(() => {
  let plain = xor(BLOCK_1_CIPHER, BLOCK_2_INTERMEDIARY)

  console.log('--- Plain text of block 2 ---')
  console.log(plain.toString('hex'))
  console.log(plain.toString())
})()
