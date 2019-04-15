const TOKEN = 'UGFkT3JhY2xlOml2L2NiY8O+7uQmXKFqNVUuI9c7VBe42FqRvernmQhsxyPnvxaF'

async function main () {
  let buf = Buffer.from(TOKEN, 'base64')
  console.log(buf.toString())
}

main()
