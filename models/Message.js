const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  username: { type: String, default: 'Anon' },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null }
});

module.exports = mongoose.model('Message', MessageSchema);
