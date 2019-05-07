const ORIGINAL_PLAIN = Buffer.from('{"id":100,"roleAdmin":false}\x04\x04\x04\x04')
const TARGET_PLAIN = Buffer.from('{"id":100,"roleAdmin":true}\x05\x05\x05\x05\x05')

console.log('Plain text 0')
console.log('before: ', ORIGINAL_PLAIN.slice(0, 16))
console.log('after : ', TARGET_PLAIN.slice(0, 16))
console.log('Plain text 1')
console.log('before: ', ORIGINAL_PLAIN.slice(16))
console.log('after : ', TARGET_PLAIN.slice(16))
