const fs = require('fs')
const path = require('path')
const pAll = require('p-all')
const pad = require('left-pad')
const flatten = require('just-flatten-it')
const Gauge = require('gauge')
const _ = require('lodash')
const Api = require('./api')

const cache = {
  /**
   * cache gifts
   */
  save (gifts) {
    fs.writeFileSync(path.resolve(__dirname, './vendors/gifts.json'), JSON.stringify(gifts, null, 2), 'utf8')
    console.log('Check ./vendors/gifts.json')
  },
  /**
   * load gifts
   */
  load () {
    let gifts = JSON.parse(fs.readFileSync(path.resolve(__dirname, './vendors/gifts.json'), 'utf8'))
    gifts = _.uniqBy(gifts, ({ id }) => id)
    console.log('Available gifts: ', gifts.length)
    return gifts
  },
}

async function spawnGifts () {
  const PREFIX = 'yelo_spawn_'
  const SIZE = 900
  const PASSWORD = '12345678'
  const OFFSET = 0
  const CONCURRENCY = 4

  const names = Array.from(Array(SIZE))
    .map((v, i) => pad(i + OFFSET, 3, '0'))
    .map((n) => `${PREFIX}${n}`)

  const create = async function (name) {
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
    let billId = await api.createOrder(4294967296)
    await api.pay(billId)
    return await api.getGifts()
  }

  // let gifts = flatten([await create('yelo_spawn_001')])

  const gauge = new Gauge()
  let counter = {
    all: 0,
    done: 0,
  }

  const createGifts = names.map((name) => {
    return () => create(name).then((gifts) => {
      let done = ++counter.done
      let all = counter.all
      gauge.show(`Create Ticket ${done} / ${all}`, done / all)
      return gifts
    })
  })
  counter.all = names.length
  gauge.show('Create Ticket')

  let gifts = await pAll(createGifts, {
    concurrency: CONCURRENCY,
  })
  gifts = flatten(gifts)
  gauge.hide()

  console.log(gifts)
  cache.save(gifts)
}

async function kick () {
  const USER = ['yelo', '12345678']
  const CONCURRENCY = 4

  const gauge = new Gauge()
  let counter = {
    all: 0,
    done: 0,
  }

  let api = new Api()
  await api.login(...USER)
  console.log('Logged in')

  let gifts = cache.load()
  counter.all = gifts.length
  gauge.show('Kick')

  await pAll(gifts.map((gift) =>
    () => api.kick(gift).then((ret) => {
      let done = ++counter.done
      let all = counter.all
      gauge.show(`Kick ${done} / ${all}`, done / all)
      return ret
    })
  ), {
    concurrency: CONCURRENCY,
  })
  gauge.hide()
  console.log('Kick: Done.')
}

async function main () {
  try {
    /**
     * create gifts
     * only once
     */
    await spawnGifts()

    /**
     * do remove robots
     */
    await kick()
  } catch (error) {
    console.error(error)
  }
}

main()
