const micro = require('micro')

const PORT = 8122

const server = micro((req) => {
  console.log(req.url, req.rawHeaders)
  return 'Bye'
})

server.listen(PORT)
