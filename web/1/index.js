const got = require('got')
const cheerio = require('cheerio')

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
  const { body } = await got(url)
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

main()
