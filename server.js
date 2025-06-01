const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// 💾 Connect ke MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/groupchat', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// Kirim riwayat pesan saat user baru terhubung
io.on('connection', async (socket) => {
  console.log('User connected');

  // Kirim 50 pesan terbaru ke user baru
  const messages = await Message.find().sort({ timestamp: 1 }).limit(50);
  socket.emit('chat_history', messages);

  socket.on('send_message', async (data) => {
    const message = new Message(data);
    await message.save();
    io.emit('receive_message', message);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

require('dotenv').config();
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
