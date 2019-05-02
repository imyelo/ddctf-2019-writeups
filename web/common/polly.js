const path = require('path')
const { Polly } = require('@pollyjs/core')
const NodeHttpAdapter = require('@pollyjs/adapter-node-http')
const FSPersister = require('@pollyjs/persister-fs')

Polly.register(NodeHttpAdapter)
Polly.register(FSPersister)

function createPolly (name, dir) {
  const polly = new Polly(name, {
    adapters: ['node-http'],
    persister: 'fs',
  })
  polly.configure({
    persisterOptions: {
      fs: {
        recordingsDir: path.resolve(dir, './vendors/_polly'),
      },
    },
  })
  return polly
}

exports.createPolly = createPolly
