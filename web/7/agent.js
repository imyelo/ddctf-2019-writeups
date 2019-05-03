const micro = require('micro')

const PORT = process.env.PORT || 8123
const SAMPLE = JSON.stringify([
  {
    "local_address": "127.0.0.1:3306",
    "Process_name": "2072/mysqld",
  },
])

const server = micro(() => SAMPLE)

server.listen(PORT, () => {
  console.log('Simplified-Agent for DDCTF-2019-Web-7 started on', server.address())
})
