## 🤖 Traffic HTTP

For sended traffic website on bot telegram with proxies/non-proxies

### ⚒️ Command Management Access

The following is cmd management in bot :

| CMD       | Information |
|-----------|-------------|
| /send_visitor `url` `bot` `delay`    | example : `/send_visitor http://websitetarget.com 100 5` |
| /stop_visitor     | stop process bot |
| /getproxy     | viewing proxy list |
| /setproxy `user:pass@ip:port` or `ip:port`    | adding new proxy |
| /removeproxy `user:pass@ip:port` or `ip:port`    | remove proxy |
| /getreferers     | view referers list |
| /setreferer `http://example.com`    | set host referer |
| /removerefer `http://example.com`    | remove host referer |

#### ⚠️ Warning

- must use `http://` like `/send_visitor http://target.com 10 5`

#### 🆕 Update Version

- Version 4.0.0 (29/11/2023)
Update running scripted without proxies 

- Version 3.3.4 (20/11/2023)
Fix bug send http:// error 

- Version 3.3.2 (18/11/2023)
Added a proxy to support use with username and password, or without username and password, like `user:pass@ip:port` and `ip:port` 

#### 📋 Requirements 

```bash
apt-get update -y && apt-get upgrade -y
```

```bash
apt install nodejs git npm yarn
```

```bash
npm install node-telegram-bot-api axios-https-proxy-fix fs yarn
```

#### 🚀 Run this bot

- Prepare youre API Token telegram.

```bash
npm install webvisitor
```

```bash
mv node_modules/webvisitor ./
```

```bash
cd webvisitor
```

```bash
set your api token in config.js

set your proxy in proxy.txt and 

set host referer in referers.txt
```

- run bot
```bash
yarn start
```

- run on background
```javascript
npm install pm2
```
- and run
```javascript
npx pm2 start main.js
```
- for stop
```javascript
npx pm2 stop main.js
```
 
#### 📢 Information

get bug? open an issue and we will fix it asap soon as possible.

`Use as necessary, take your own risk!`

#### 📝 License

Licensed under the [MIT License](https://github.com/bovalonee/webvisitor/blob/main/LICENSE).
