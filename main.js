const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const axios = require('axios-https-proxy-fix');

const { TELEGRAM_TOKEN } = require('./config.js');
const token = TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });

let isSendingVisitors = false;
let stopSendingTimeout = null;

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username;
  const firstName = msg.from.first_name;
  bot.sendMessage(msg.chat.id, 'Welcome!\n\nPlease enter the URL, number of bots, and delay (in seconds) to start sending visitors.\n\nExample: /send_visitor https://example.com 10 5\n\n/info : Information bot & cmd managements this bot');
});

bot.onText(/\/info/, (msg) => {
  const chatId = msg.chat.id;
  const opts = {
    reply_markup: {
      inline_keyboard: [
        [{
          text: 'GitHub Repository',
          url: 'https://github.com/bovalonee/'
        }]
      ]
    }
  };
  bot.sendMessage(chatId, 'Welcome Back👋 The script uses the GET HTTP system to send traffic to the target website/blog.\n ▾━━━━━━━━━━━━━━━━━━━━\n ┏⌑ /send_visitor : sends traffic to the target website/blog. Example (/send_visitor http://target.com 10 5) 10 is a bot visitor that you want to input to the target website and 5 is the delay per bot in seconds.\n ┏⌑ /stop_send_visitor : to stop ongoing visitor traffic\n ▾━━━━━━━━━━━━━━━━━━━━\n ┏⌑ /getreferers : view host referers\n ┏⌑ /removereferer <URL> : removes host referers\n ┏⌑ /setreferer <URL> : adds host referer\n ▾━━━━━━━━━━━━━━━━━━━━\n ┏⌑ /getproxy : view available proxies\n ┏⌑ /setproxy : adds proxy\n ┏⌑ /removeproxy : remove proxy\n ▾━━━━━━━━━━━━━━━━━━━━\nI am not responsible for what happens, take your own risk', opts);
});

bot.onText(/\/setreferer (.+)/, (msg, match) => {
  if (isSendingVisitors) {
    bot.sendMessage(msg.chat.id, 'A visitor delivery is currently running. Cannot change referer at this time.');
    return;
  }

  const referer = match[1];

  if (!validateUrl(referer)) {
    bot.sendMessage(msg.chat.id, 'Invalid referer. Please enter a valid referer.');
    return;
  }

  const referers = loadFileLines('referers.txt');
  referers.push(referer);
  fs.writeFileSync('referers.txt', referers.join('\n'));
  bot.sendMessage(msg.chat.id, 'Referer has been added.');
});

bot.onText(/\/removereferer (.+)/, (msg, match) => {
  if (isSendingVisitors) {
    bot.sendMessage(msg.chat.id, 'A visitor delivery is currently running. Cannot remove referer at this time.');
    return;
  }

  const referer = match[1];

  const referers = loadFileLines('referers.txt');
  const index = referers.indexOf(referer);

  if (index === -1) {
    bot.sendMessage(msg.chat.id, 'Referer not found.');
    return;
  }

  referers.splice(index, 1);
  fs.writeFileSync('referers.txt', referers.join('\n'));

  bot.sendMessage(msg.chat.id, 'Referer has been removed.');
});

bot.onText(/\/getreferers/, (msg) => {
  const referers = loadFileLines('referers.txt');

  if (referers.length === 0) {
    bot.sendMessage(msg.chat.id, 'No referers are currently registered.');
    return;
  }

  const refererList = referers.map((referer, index) => `${index + 1}. ${referer}`).join('\n');
  bot.sendMessage(msg.chat.id, `List of registered referers:\n${refererList}`);
});

bot.onText(/\/send_visitor (.+)/, (msg, match) => {
  if (isSendingVisitors) {
    bot.sendMessage(msg.chat.id, 'A visitor delivery is currently running. Please wait until it completes or use the /stop_send_visitor command to stop it.');
    return;
  }

  const chatId = msg.chat.id;
  const [url, numBots, delay] = match[1].split(' ');

  if (!validateUrl(url)) {
    bot.sendMessage(chatId, 'Invalid URL. Please enter a valid URL.');
    return;
  }

  if (!validateInputNumber(numBots) || numBots <= 0) {
    bot.sendMessage(chatId, 'Invalid number of bots. Please enter a number greater than 0.');
    return;
  }

  if (!validateInputNumber(delay) || delay < 0) {
    bot.sendMessage(chatId, 'Invalid delay. Please enter a delay greater than or equal to 0.');
    return;
  }

  isSendingVisitors = true;
  bot.sendMessage(chatId, 'Sending visitors started.');

  const userAgents = loadFileLines('user-agents.txt');
  const referers = loadFileLines('referers.txt');
  const proxyList = loadFileLines('proxy.txt');

  if (!userAgents.length || !referers.length) {
    bot.sendMessage(chatId, 'Files user-agents.txt, referers.txt not found or empty.');
    isSendingVisitors = false;
    return;
  }
  if (!proxyList.length) {
    bot.sendMessage(chatId, 'Files proxy.txt not found or empty.\nIf the proxy is empty, the script will run without a proxy');
  }

  sendVisitors(url, numBots, delay * 1000, chatId, userAgents, referers, proxyList);
});

bot.onText(/\/stop_send_visitor/, (msg) => {
  if (!isSendingVisitors) {
    bot.sendMessage(msg.chat.id, 'No visitor delivery is currently in progress.');
    return;
  }

  clearTimeout(stopSendingTimeout);

  isSendingVisitors = false;
  bot.sendMessage(msg.chat.id, 'Sending visitors stopped. Note: It may take some time to fully stop.');
});

bot.onText(/\/setproxy (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const proxy = match[1];

  if (!validateProxy(proxy)) {
    bot.sendMessage(chatId, 'Invalid proxy format. Please enter a valid proxy in the format "user:pass@ip:port" or "ip:port".');
    return;
  }

  const proxies = loadFileLines('proxy.txt');
  proxies.push(proxy);
  fs.writeFileSync('proxy.txt', proxies.join('\n'));
  bot.sendMessage(chatId, 'Proxy has been added.');
});

bot.onText(/\/getproxy/, (msg) => {
  const chatId = msg.chat.id;
  const proxies = loadFileLines('proxy.txt');

  if (proxies.length === 0) {
    bot.sendMessage(chatId, 'No proxies are currently registered.');
    return;
  }

  const proxyList = proxies.map((proxy, index) => `${index + 1}. ${proxy}`).join('\n');
  bot.sendMessage(chatId, `List of registered proxies:\n${proxyList}`);
});

bot.onText(/\/removeproxy (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const proxyToRemove = match[1];

  const proxies = loadFileLines('proxy.txt');
  const index = proxies.indexOf(proxyToRemove);

  if (index === -1) {
    bot.sendMessage(chatId, 'Proxy not found.');
    return;
  }

  proxies.splice(index, 1);
  fs.writeFileSync('proxy.txt', proxies.join('\n'));

  bot.sendMessage(chatId, 'Proxy has been removed.');
});

function validateProxy(proxy) {
  const proxyRegex = /^((\S+:\S+@)?\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+)$/;

  return proxyRegex.test(proxy);
}

function validateUrl(url) {
  // Implement your own validation logic here, or use a library like 'valid-url'
  return true;
}

function validateInputNumber(num) {
  return !isNaN(num) && Number.isInteger(Number(num));
}

function loadFileLines(filepath) {
  try {
    const fileContent = fs.readFileSync(filepath, 'utf-8');
    return fileContent.split('\n').filter(line => line.length > 0);
  } catch (error) {
    return [];
  }
}

function sendVisitors(url, numBots, delay, chatId, userAgents, referers, proxyList) {
  let visitorsSent = 0;

  function getRandomElementFromArray(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function getRandomProxy() {
    return getRandomElementFromArray(proxyList);
  }

  function sendVisitor() {
    if (visitorsSent >= numBots) {
      isSendingVisitors = false;
      bot.sendMessage(chatId, 'Sending visitors completed.');
      return;
    }

    const userAgent = getRandomElementFromArray(userAgents);
    const referer = getRandomElementFromArray(referers);
    const proxy = proxyList.length > 0 ? getRandomProxy() : null;

    const proxyParts = proxy ? proxy.split('@') : [];
    const proxyWithoutCredentials = proxyParts.length === 1 ? proxyParts[0] : proxyParts[1];
    const proxyCredentials = proxyParts.length === 1 ? '' : proxyParts[0];

    const proxyConfig = proxy
      ? {
          host: proxyWithoutCredentials.split(':')[0],
          port: parseInt(proxyWithoutCredentials.split(':')[1]),
          auth: {
            username: proxyCredentials.split(':')[0] || '',
            password: proxyCredentials.split(':')[1] || ''
          }
        }
      : null;

    axios.get(url, {
      headers: {
        'User-Agent': userAgent,
        'Referer': referer
      },
      proxy: proxyConfig
    })
      .then(() => {
        visitorsSent++;
        bot.sendMessage(chatId, `Visitor ${visitorsSent} sent.`);
        stopSendingTimeout = setTimeout(sendVisitor, delay);
      })
      .catch((error) => {
        console.error(error);
        bot.sendMessage(chatId, `Error sending visitor ${visitorsSent}. Error details: ${error.message}`);
        isSendingVisitors = false;
      });
  }

  sendVisitor();
}
