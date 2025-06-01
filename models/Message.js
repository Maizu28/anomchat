const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    type: { // Jenis pesan: teks, gambar, video, audio, stiker, rekaman suara
        type: String,
        enum: ['text', 'image', 'video', 'audio', 'sticker', 'voice', 'file'],
        default: 'text'
    },
    content: { // Isi pesan: teks itu sendiri, atau URL ke file media/stiker
        type: String,
        required: true
    },
    fileName: { // Nama asli file (untuk file media)
        type: String
    },
    senderId: { // ID unik pengirim (bisa socket.id untuk anonimitas sesi)
        type: String,
        required: true
    },
    replyTo: { // ID dari pesan yang dibalas (referensi ke pesan lain)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message', // Mereferensikan model 'Message' itu sendiri
        default: null
    },
    repliedMessageContent: { // Menyimpan cuplikan konten pesan yang dibalas untuk ditampilkan di UI
        type: String,
        default: null
    },
    repliedMessageSender: { // Menyimpan info pengirim pesan yang dibalas
        type: String,
        default: null
    },
    timestamp: { // Waktu pesan dikirim
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Message', messageSchema);