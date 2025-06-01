const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/anonchat',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Create tables if they don't exist
async function initializeDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255),
        message TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database initialized');
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

initializeDb();

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New user connected');

  socket.on('join', async (username) => {
    // Get last 50 messages from database
    try {
      const result = await pool.query(
        'SELECT username, message, timestamp FROM messages ORDER BY timestamp DESC LIMIT 50'
      );
      socket.emit('previousMessages', result.rows.reverse());
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  });

  socket.on('sendMessage', async (data) => {
    try {
      // Save to database
      await pool.query(
        'INSERT INTO messages (username, message) VALUES ($1, $2)',
        [data.username, data.message]
      );
      
      // Broadcast to all clients
      io.emit('newMessage', {
        username: data.username,
        message: data.message,
        timestamp: new Date()
      });
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Dalam socket.io connection
socket.on('sendMessage', async (data) => {
  try {
    // Save to database
    await pool.query(
      'INSERT INTO messages (username, message, reply_to) VALUES ($1, $2, $3)',
      [data.username, data.message, data.replyTo || null]
    );
    
    // Get the last inserted message with reply info
    const result = await pool.query(`
      SELECT m.id, m.username, m.message, m.timestamp, 
             r.username as reply_username, r.message as reply_message
      FROM messages m
      LEFT JOIN messages r ON m.reply_to = r.id
      ORDER BY m.id DESC LIMIT 1
    `);
    
    const newMessage = result.rows[0];
    
    // Broadcast to all clients
    io.emit('newMessage', {
      id: newMessage.id,
      username: newMessage.username,
      message: newMessage.message,
      timestamp: newMessage.timestamp,
      replyTo: newMessage.reply_to,
      replyUsername: newMessage.reply_username,
      replyMessage: newMessage.reply_message
    });
  } catch (err) {
    console.error('Error saving message:', err);
  }
});

// Modifikasi query untuk mendapatkan pesan sebelumnya
socket.on('join', async (username) => {
  try {
    const result = await pool.query(`
      SELECT m.id, m.username, m.message, m.timestamp, 
             r.username as reply_username, r.message as reply_message
      FROM messages m
      LEFT JOIN messages r ON m.reply_to = r.id
      ORDER BY m.timestamp DESC LIMIT 50
    `);
    socket.emit('previousMessages', result.rows.reverse());
  } catch (err) {
    console.error('Error fetching messages:', err);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});