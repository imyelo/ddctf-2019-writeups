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

;(async () => {
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

})()
