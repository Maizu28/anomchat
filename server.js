require('dotenv').config(); // Load environment variables from .env
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Schema Pesan MongoDB
const messageSchema = new mongoose.Schema({
  username: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
  isLocalUser: { type: Boolean, default: false }, // Menandai apakah pesan ini dari pengguna lokal
  replyTo: { // Field untuk balasan chat
    username: String,
    message: String,
    isLocalUser: Boolean
  }
});
const Message = mongoose.model('Message', messageSchema);

// Load banned words
let bannedWords = [];
try {
  const bannedWordsPath = path.join(__dirname, 'bannedWords.json');
  bannedWords = JSON.parse(fs.readFileSync(bannedWordsPath, 'utf8')).bannedWords;
  console.log('Banned words loaded:', bannedWords);
} catch (error) {
  console.error('Error loading bannedWords.json:', error);
  // Fallback ke array kosong jika file tidak ada atau tidak valid
  bannedWords = [];
}

// Middleware untuk menyajikan file statis dari folder public
app.use(express.static(path.join(__dirname, 'public')));

// Route utama untuk menyajikan index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  console.log('Seorang pengguna terhubung');

  // Muat pesan lama dari database saat pengguna terhubung
  Message.find().sort({ timestamp: 1 }).limit(100) // Batasi 100 pesan terakhir
    .then(messages => {
      socket.emit('load old messages', messages);
    })
    .catch(err => console.error('Error memuat pesan lama:', err));

  // Tangani event 'chat message' dari klien
  socket.on('chat message', async (data) => {
    let { username, message, isLocalUser, replyTo } = data;

    // Filter Kata Kasar
    bannedWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi'); // Cocokkan kata utuh, case-insensitive
      message = message.replace(regex, '***'); // Ganti dengan tanda bintang
    });

    const newMessage = new Message({
      username: username || 'Anonim', // Gunakan username anonim jika tidak ada
      message: message,
      isLocalUser: isLocalUser,
      replyTo: replyTo // Akan null jika bukan balasan
    });

    try {
      await newMessage.save(); // Simpan pesan ke database
      io.emit('chat message', { // Emit pesan ke semua klien yang terhubung
        username: newMessage.username,
        message: newMessage.message,
        timestamp: newMessage.timestamp,
        isLocalUser: newMessage.isLocalUser,
        replyTo: newMessage.replyTo
      });
    } catch (err) {
      console.error('Error menyimpan pesan:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Pengguna terputus');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});