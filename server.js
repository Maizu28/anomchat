const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer'); // Untuk menangani unggahan file

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000; // Port dari environment variable Railway atau default 3000
const MONGODB_URI = process.env.MONGO_URL; // URL koneksi MongoDB dari Railway

// --- Pengaturan Database ---
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // useCreateIndex: true, // Tambahkan ini jika ada masalah dengan versi Mongoose lama
  // useFindAndModify: false // Tambahkan ini jika ada masalah dengan versi Mongoose lama
})
.then(() => console.log('MongoDB berhasil terhubung.'))
.catch(err => console.error('Kesalahan koneksi MongoDB:', err));

const Message = require('.models/message'); // Model skema pesan MongoDB

// --- Menyajikan File Statis ---
// Folder 'public' akan berisi file HTML, CSS, JS, dan gambar klien
app.use(express.static(path.join(__dirname, 'public')));

// --- Pengaturan Unggahan File (Contoh Dasar) ---
// Konfigurasi multer untuk menyimpan file yang diunggah.
// PERHATIAN: Untuk produksi, SANGAT DISARANKAN menggunakan layanan penyimpanan cloud
// seperti Cloudinary, AWS S3, atau Google Cloud Storage karena filesystem Railway bersifat ephemeral
// (file akan hilang saat restart/redeploy).
// Contoh ini menyimpan ke folder 'uploads' sementara di dalam 'public'.
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = 'public/uploads/'; // Path dasar
    if (file.mimetype.startsWith('image/')) {
      uploadPath += 'images/';
    } else if (file.mimetype.startsWith('video/')) {
      uploadPath += 'videos/';
    } else if (file.mimetype.startsWith('audio/')) {
      uploadPath += 'audios/';
    } else {
      uploadPath += 'others/'; // Untuk jenis file lain
    }

    const fs = require('fs');
    if (!fs.existsSync(uploadPath)) { // Buat direktori jika belum ada
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Buat nama file unik untuk menghindari konflik
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_')); // Ganti spasi dengan underscore
  }
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // Batas ukuran file misal 10MB
});

// Endpoint untuk menangani unggahan file
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('Tidak ada file yang diunggah.');
  }
  // Kembalikan path ke file yang diunggah
  // Path ini relatif terhadap folder 'public' jika menyajikan file statis.
  // Pastikan path ini dapat diakses.
  // Contoh: req.file.destination -> "public/uploads/images/"
  //         req.file.filename   -> "1620000000-myimage.png"
  //         filePath akan menjadi "/uploads/images/1620000000-myimage.png"
  const relativePath = path.join(req.file.destination.replace('public', ''), req.file.filename).replace(/\\/g, "/");
  res.json({ filePath: relativePath });
});


// --- Informasi Grup ---
const groupInfo = {
    name: "Grup Chat Anonim Keren 😎",
    profilePicture: "/img/default-group-avatar.png" // Path ke avatar grup default di public/img
};

// --- Koneksi Socket.IO ---
io.on('connection', (socket) => {
    // 'socket' merepresentasikan koneksi dari satu klien
    console.log('Seorang pengguna terhubung:', socket.id); // socket.id adalah ID unik untuk setiap koneksi

    // Kirim info grup dan riwayat chat ke pengguna yang baru terhubung
    socket.emit('group info', groupInfo);
    Message.find().sort({ timestamp: -1 }).limit(50) // Ambil 50 pesan terakhir (urut terbaru dulu)
        .populate('replyTo') // Jika Anda ingin mengambil detail pesan yang dibalas
        .then(messages => {
            socket.emit('load old messages', messages.reverse()); // Balik urutan agar yang lama di atas
        })
        .catch(err => console.error('Error mengambil pesan:', err));

    socket.on('disconnect', () => {
        console.log('Pengguna terputus:', socket.id);
        // Anda bisa menambahkan logika untuk memberitahu pengguna lain bahwa seseorang offline
    });

    // Ketika server menerima pesan 'chat message' dari klien
    socket.on('chat message', async (msgData) => {
        const messageDataToSave = {
            type: msgData.type || 'text',
            content: msgData.content,
            fileName: msgData.fileName, // Untuk file media
            senderId: socket.id, // Gunakan socket.id sebagai ID pengirim anonim
            timestamp: new Date()
        };

        if (msgData.replyTo) { // Jika ini adalah balasan
            try {
                const repliedMsg = await Message.findById(msgData.replyTo);
                if (repliedMsg) {
                    messageDataToSave.replyTo = msgData.replyTo;
                    messageDataToSave.repliedMessageContent = repliedMsg.type === 'text' ? repliedMsg.content : `[${repliedMsg.type}]`; // Simpan cuplikan atau tipe
                    messageDataToSave.repliedMessageSender = `User ${repliedMsg.senderId.substring(0, 6)}`;
                }
            } catch (e) { console.error("Error finding replied message:", e); }
        }

        const message = new Message(messageDataToSave);

        try {
            const savedMessage = await message.save();
            // Jika replyTo ada, populate sebelum mengirim ke klien agar data repliedMsg tersedia
            const populatedMessage = await Message.findById(savedMessage._id).populate('replyTo');
            io.emit('chat message', populatedMessage); // Kirim pesan ke SEMUA klien yang terhubung
        } catch (err) {
            console.error('Error menyimpan pesan:', err);
            socket.emit('message error', 'Pesan tidak dapat dikirim.'); // Opsional: kirim error ke pengirim
        }
    });

    // Tambahkan handler untuk event lain seperti 'typing', 'stop typing' jika diperlukan
});

// --- Rute ---
// Rute utama akan menyajikan file index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
});