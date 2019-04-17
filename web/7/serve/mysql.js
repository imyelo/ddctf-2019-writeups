const net = require('net')

const server = net.createServer((socket) => {
  console.log('server connected')
  console.log(socket)
  socket.end('goodbye\n')
}).on('error', (err) => {
  throw err
})

server.listen(3306, () => {
  console.log('opened server on', server.address())
})
