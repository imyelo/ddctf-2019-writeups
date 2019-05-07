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

const ORIGINAL_TOKEN = 'UGFkT3JhY2xlOml2L2NiY8O+7uQmXKFqNVUuI9c7VBe42FqRvernmQhsxyPnvxaF'

const intermediary0 = Buffer.from('00df71d27118c10e13141c66fc84619b', 'hex')
const plain0 = Buffer.from('{"id":100,"roleA')

let iv = xor(intermediary0, plain0)
console.log('IV:', iv)
// <- IV: <Buffer 7b fd 18 b6 53 22 f0 3e 23 38 3e 14 93 e8 04 da>

const cipher0 = Buffer.from('c3beeee4265cb3792c43365bd63a5516', 'hex')
const cipher1 = Buffer.from(ORIGINAL_TOKEN, 'base64').slice(32)

const token = Buffer.concat([iv, cipher0, cipher1]).toString('base64')

console.log('Token:', token)
// <- Token: e/0YtlMi8D4jOD4Uk+gE2sO+7uQmXLN5LEM2W9Y6VRa42FqRvernmQhsxyPnvxaF
