const ORIGINAL_INTERMEDIARY = Buffer.from('2b430d2b505b525c55164b04400f0722a7d3878a0466c70b59264b5ed33f5013', 'hex')
const TARGET_PLAIN = Buffer.from('{"id":100,"roleAdmin":true}\x05\x05\x05\x05\x05')

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

let TARGET_CIPHER_0 = xor(ORIGINAL_INTERMEDIARY.slice(16), TARGET_PLAIN.slice(16))
console.log(TARGET_CIPHER_0)
// <- <Buffer c3 be ee e4 26 5c b3 79 2c 43 36 5b d6 3a 55 16>
