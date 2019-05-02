const fs = require('fs')
const path = require('path')
const _ = require('lodash')

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

module.exports = cache
