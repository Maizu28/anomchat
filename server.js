const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer'); // For handling file uploads

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGO_URL; // Railway provides this

// --- Database Setup ---
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true, // Add this if you have issues with older mongoose versions
  useFindAndModify: false // Add this if you have issues with older mongoose versions
})
.then(() => console.log('MongoDB connected successfully.'))
.catch(err => console.error('MongoDB connection error:', err));

const Message = require('.models/message'); // We'll create this model

// --- Static Files ---
app.use(express.static(path.join(__dirname, 'public')));

// --- File Uploads Setup (Basic Example) ---
// Configure multer for storing uploaded files.
// For production, consider using a cloud storage service like Cloudinary or AWS S3.
// Railway's ephemeral filesystem is not suitable for permanent storage of user uploads.
// However, for small, temporary files during processing, it might work, but they will be lost on restart/redeploy.
// This example stores to a temporary 'uploads' folder in 'public'.
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = 'public/uploads/';
    if (file.mimetype.startsWith('image/')) {
      uploadPath += 'images/';
    } else if (file.mimetype.startsWith('video/')) {
      uploadPath += 'videos/';
    } else if (file.mimetype.startsWith('audio/')) {
      uploadPath += 'audios/';
    } else {
      uploadPath += 'others/';
    }
    // Ensure directory exists (you might need to create these manually or use fs.mkdirSync)
    const fs = require('fs');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  // Return the path to the uploaded file
  // IMPORTANT: This path is relative to the 'public' folder if serving static files.
  // For Railway, ensure this path is accessible.
  const filePath = `/uploads/${req.file.destination.split('/').slice(-2).join('/')}${req.file.filename}`;
  res.json({ filePath: filePath });
});


// --- Group Info ---
const groupInfo = {
    name: "Anonymous Geeks Hub 🤓",
    profilePicture: "/img/group-avatar.png" // Path to a default group avatar in public/img
};

// --- Socket.IO Connection ---
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Send group info and chat history to the newly connected user
    socket.emit('group info', groupInfo);
    Message.find().sort({ timestamp: 1 }).limit(50) // Get last 50 messages
        .then(messages => {
            socket.emit('load old messages', messages);
        })
        .catch(err => console.error('Error fetching messages:', err));

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });

    socket.on('chat message', async (msgData) => {
        const message = new Message({
            type: msgData.type || 'text', // 'text', 'image', 'video', 'audio', 'sticker', 'voice'
            content: msgData.content,
            senderId: socket.id, // Anonymous ID for this session
            replyTo: msgData.replyTo, // Message ID being replied to
            timestamp: new Date()
        });

        try {
            const savedMessage = await message.save();
            io.emit('chat message', savedMessage); // Broadcast to all clients
        } catch (err) {
            console.error('Error saving message:', err);
            // Optionally send an error back to the sender
            socket.emit('message error', 'Could not send message.');
        }
    });

    // Add handlers for other events like 'typing', 'stop typing' if needed
});

// --- Routes ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});