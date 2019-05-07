const { crack, challenge } = require('./crack-06')

const ORIGINAL_TOKEN = 'UGFkT3JhY2xlOml2L2NiY8O+7uQmXKFqNVUuI9c7VBe42FqRvernmQhsxyPnvxaF'
const ORIGINAL_IV = Buffer.from(ORIGINAL_TOKEN, 'base64').slice(0, 16)
const CIPHER = Buffer.from('c3beeee4265cb3792c43365bd63a5516', 'hex')

;(async () => {
  await crack(ORIGINAL_IV, CIPHER, challenge)
})()
