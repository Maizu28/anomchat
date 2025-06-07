require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const mongoose = require('mongoose');
const Message = require('./models/Message');
const Filter = require('bad-words');
const FuzzySet = require('fuzzyset.js');

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);

const filter = new Filter();
const fuzzy = FuzzySet(filter.list); // fuzzy bad words

const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connected');
}).catch(console.error);

app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Simpel grup info statis (bisa dikembangkan jadi dinamis)
const groupInfo = {
  name: 'Anon Group Chat',
  description: 'Chat anonim realtime dengan fitur lengkap',
  profilePic: 'https://cdn-icons-png.flaticon.com/512/1946/1946429.png'
};

app.get('/', async (req, res) => {
  // load 50 pesan terakhir untuk halaman awal
  const messages = await Message.find({}).sort({createdAt: 1}).limit(50).lean();
  res.render('index', { groupInfo, messages });
});

// Helper fuzzy filter kata kasar
function isBadWord(text) {
  const words = text.toLowerCase().split(/\s+/);
  for (const w of words) {
    const matches = fuzzy.get(w);
    if (matches && matches.some(m => m[0] > 0.85)) return true;
  }
  return false;
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('sendMessage', async (data) => {
    let { username, text, replyTo } = data;
    if (!text || text.trim() === '') return;

    if (isBadWord(text)) {
      socket.emit('badWordDetected', 'Pesan mengandung kata yang tidak pantas!');
      return;
    }

    username = username || 'Anon';

    const message = new Message({ username, text, replyTo: replyTo || null });
    await message.save();

    // Kirim pesan ke semua client
    io.emit('newMessage', {
      _id: message._id,
      username: message.username,
      text: message.text,
      replyTo: message.replyTo,
      createdAt: message.createdAt
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
