const micro = require('micro')

const PORT = 8122

const server = micro((req) => {
  console.log(req)
  return 'Bye'
})

server.listen(PORT)
