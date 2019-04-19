const fs = require('fs')
const path = require('path')
const got = require('got')
const FormData = require('form-data')
const cheerio = require('cheerio')
const { base64 } = require('../common/utils')

const HOST = 'http://117.51.148.166'
const AUTHORIZATION = 'dd@ctf:DD@ctf#000'

async function upload (filePath) {
  const url = `${HOST}/upload.php?type=upload`
  const form = new FormData()
  form.append('file', fs.createReadStream(filePath))

  const { body } = await got.post(url, {
    headers: {
      'Authorization': `Basic ${base64.encode(AUTHORIZATION)}`,
    },
    body: form,
  })
  const $ = cheerio.load(body)
  const source = `${HOST}/${$('img').attr('src')}`
  const message = body.split('<br>')[1] || body.split('<br>')[0]
  return {
    source,
    message,
  }
}

if (module.parent) {
  module.exports = upload
  return
}

/**
 * Usages:
 *
 * ```sh
 * node ./upload.js [file]
 * ```
 *
 * Example:
 *
 * ```sh
 * node ./upload.js ./assets/avatar.jpg
 * # <- { source: 'http://117.51.148.166/image/190419092022_1843117213.jpg', message: '[Check Error]上传的图片源代码中未包含指定字符串:<font color="red">phpinfo()</font>' }
 * ```
 *
 */
;(async () => {
  let result = await upload(path.resolve(process.cwd(), process.argv[2]))
  process.stdout.write(JSON.stringify(result))
})()
