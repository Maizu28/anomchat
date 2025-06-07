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

// Message Schema (jika tidak dipisahkan ke file lain)
const messageSchema = new mongoose.Schema({
  username: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
  isLocal: { type: Boolean, default: false },
  replyTo: {
    username: String,
    message: String,
    isLocal: Boolean
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
  // Fallback to an empty array if the file doesn't exist or is invalid
  bannedWords = [];
}

// Middleware
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('A user connected');

  // Load old messages from DB
  Message.find().sort({ timestamp: 1 }).limit(100) // Limit to last 100 messages for example
    .then(messages => {
      socket.emit('load old messages', messages);
    })
    .catch(err => console.error('Error loading old messages:', err));

  socket.on('chat message', async (data) => {
    let { username, message, isLocal, replyTo } = data;

    // Filter Kata Kasar
    bannedWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi'); // Match whole word, case-insensitive
      message = message.replace(regex, '***'); // Replace with asterisks
    });

    const newMessage = new Message({
      username: username || 'Anonymous',
      message: message,
      isLocal: isLocal,
      replyTo: replyTo // Akan null jika bukan balasan
    });

    try {
      await newMessage.save();
      io.emit('chat message', {
        username: newMessage.username,
        message: newMessage.message,
        timestamp: newMessage.timestamp,
        isLocal: newMessage.isLocal,
        replyTo: newMessage.replyTo
      });
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});