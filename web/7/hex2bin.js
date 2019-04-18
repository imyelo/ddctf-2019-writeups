const getStdin = require('get-stdin')

/**
 * Usage:
 *
 * ```sh
 * cat sample.hex | node ./hex2buf > sample.bin
 * echo 9000000185a23f0000000040080000000000000000000000000000000000000000000000726f6f7400006d7973716c5f6e61746976655f70617373776f72640053035f6f73054c696e75780c5f636c69656e745f6e616d65086c69626d7973716c045f7069640532363837370f5f636c69656e745f76657273696f6e06352e362e3433095f706c6174666f726d067838365f3634 | node ./hex2buf > greating.bin
 * ```
 *
 */

;(async () => {
  let hex = await getStdin()
  let buf = Buffer.from(hex, 'hex')
  process.stdout.write(buf)
})()
