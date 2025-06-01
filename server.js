const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const bannedWords = ['anjing', 'goblok', 'tolol']; // tambah sesuai kebutuhan
let userCount = 1;

wss.on('connection', (ws) => {
  ws.username = `User-${userCount++}`;

  ws.on('message', (message) => {
    const msg = message.toString().trim();

    for (const word of bannedWords) {
      if (msg.toLowerCase().includes(word)) {
        ws.send('[SYSTEM] Pesan kamu mengandung kata yang tidak diperbolehkan.');
        return;
      }
    }

    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(`${ws.username}: ${msg}`);
      }
    });
  });

  ws.send(`[SYSTEM] Selamat datang ${ws.username}!`);
});
