const pad = require('left-pad')
const flatten = require('just-flatten-it')
const cache = require('./cache')
const Api = require('./api')
const { createBatch } = require('../common/batch')

async function createGifts () {
  const PREFIX = 'yelo_spawn_1_'
  const SIZE = 900
  const PASSWORD = '12345678'
  const OFFSET = 0

  const inputs = Array.from(Array(SIZE))
    .map((v, i) => pad(i + OFFSET, 3, '0'))
    .map((n) => [`${PREFIX}${n}`])

  const batch = createBatch({
    name: 'getting gifts',
    async job (name) {
      let api = new Api()
      try {
        await api.login(name, PASSWORD)
      } catch (error) {
        await api.register(name, PASSWORD)
      }
      try {
        let gifts = await api.getGifts()
        if (gifts.length > 0) {
          return gifts
        }
      } catch (e) {}
      let billId = await api.createBill({ price: 4294967296 })
      await api.payBill(billId)
      return await api.getGifts()
    },
  })

  let gifts = await batch(inputs)
  gifts = flatten(gifts)

  console.log(gifts)
  cache.save(gifts)
}

async function kick () {
  const USER = ['yelo', '12345678']

  let api = new Api()
  await api.login(...USER)

  let batch = createBatch({
    name: 'kicking',
    async job (gift) {
      return await api.kick(gift)
    },
  })

  let gifts = cache.load()
  await batch(gifts.map((gift) => [gift]))

  console.log('Kicking: Done.')
}

;(async () => {
    /**
     * create gifts
     * only once
     */
    await createGifts()
  
    /**
     * do remove robots
     */
    await kick()
})()
