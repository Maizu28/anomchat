const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['text', 'image', 'video', 'audio', 'sticker', 'voice', 'file'], // Added 'file' for general files
        default: 'text'
    },
    content: { // For text messages, file URLs, sticker IDs/URLs
        type: String,
        required: true
    },
    fileName: { // Original name of the uploaded file
        type: String
    },
    senderId: { // Could be a temporary session ID for anonymity
        type: String,
        required: true
    },
    replyTo: { // ID of the message being replied to
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: null
    },
    repliedMessageContent: { // Store a snippet of the replied message text/type for UI
        type: String,
        default: null
    },
    repliedMessageSender: {
        type: String,
        default: null
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Message', messageSchema);