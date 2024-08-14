const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const axios = require('axios-https-proxy-fix');
const { TELEGRAM_TOKEN } = require('./config.js');
const token = TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });

let isSendingVisitors = false;
let stopSendingTimeout = null;

// Menu keyboard options
const mainMenu = {
  reply_markup: {
    keyboard: [
      [{ text: '🚀 Send Visitor' }],
      [{ text: '🛑 Stop Visitor' }],
      [{ text: '📄 Manage Referers' }, { text: '🕵️‍♂️ Manage Proxies' }],
      [{ text: 'ℹ️ Info' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: true
  }
};

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Welcome! Please choose an option on keyword:', mainMenu);
});

bot.onText(/🚀 Send Visitor/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Please enter the URL, number of bots, and delay (in seconds):\n\nExample: /send_visitor https://example.com 10 5');
});

bot.onText(/🛑 Stop Visitor/, (msg) => {
  stopSendVisitorCommand(msg);
});

bot.onText(/📄 Manage Referers/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Please choose an action:\n\n- Add Referer: /setreferer <URL>\n- Remove Referer: /removereferer <URL>\n- View Referers: /getreferers');
});

bot.onText(/🕵️‍♂️ Manage Proxies/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Please choose an action:\n\n- Add Proxy: /setproxy <proxy>\n- Remove Proxy: /removeproxy <proxy>\n- View Proxies: /getproxy');
});

bot.onText(/ℹ️ Info/, (msg) => {
  bot.sendMessage(msg.chat.id, 'ℹ️ Information:\n\nThe script uses the GET HTTP system to send traffic to the target website/blog.\n\n➖ /send_visitor : sends traffic to the target website/blog.\n➖ /stop_send_visitor : to stop ongoing visitor traffic\n➖ /getreferers : view host referers\n➖ /removereferer <URL> : removes host referers\n➖ /setreferer <URL> : adds host referer\n➖ /getproxy : view available proxies\n➖ /setproxy : adds proxy\n➖ /removeproxy : remove proxy\n\n⚠️ I am not responsible for what happens, take your own risk');
});

// Handling visitor commands
bot.onText(/\/send_visitor (.+)/, (msg, match) => {
  startSendingVisitors(msg, match);
});

bot.onText(/\/stop_send_visitor/, (msg) => {
  stopSendVisitorCommand(msg);
});

// Implementing the rest of the commands
function startSendingVisitors(msg, match) {
  if (isSendingVisitors) {
    bot.sendMessage(msg.chat.id, 'A visitor delivery is currently running. Please wait until it completes or use /stop_send_visitor to stop it.');
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
}

function stopSendVisitorCommand(msg) {
  if (!isSendingVisitors) {
    bot.sendMessage(msg.chat.id, 'No visitor delivery is currently in progress.');
    return;
  }
  clearTimeout(stopSendingTimeout);
  isSendingVisitors = false;
  bot.sendMessage(msg.chat.id, 'Sending visitors stopped. Note: It may take some time to fully stop.');
}

function getReferersCommand(msg) {
  const referers = loadFileLines('referers.txt');
  if (referers.length === 0) {
    bot.sendMessage(msg.chat.id, 'No referers are currently registered.');
    return;
  }
  const refererList = referers.map((referer, index) => `${index + 1}. ${referer}`).join('\n');
  bot.sendMessage(msg.chat.id, `List of registered referers:\n${refererList}`);
}

function getProxiesCommand(msg) {
  const proxies = loadFileLines('proxy.txt');
  if (proxies.length === 0) {
    bot.sendMessage(msg.chat.id, 'No proxies are currently registered.');
    return;
  }
  const proxyList = proxies.map((proxy, index) => `${index + 1}. ${proxy}`).join('\n');
  bot.sendMessage(msg.chat.id, `List of registered proxies:\n${proxyList}`);
}

// Validation and file handling functions remain unchanged...

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
    const proxyConfig = proxy ? {
      host: proxyWithoutCredentials.split(':')[0],
      port: parseInt(proxyWithoutCredentials.split(':')[1]),
      auth: {
        username: proxyCredentials.split(':')[0] || '',
        password: proxyCredentials.split(':')[1] || ''
      }
    } : null;

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