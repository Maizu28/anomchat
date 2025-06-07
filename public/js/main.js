const socket = io();

const chatLeft = document.getElementById('chat-left');
const chatRight = document.getElementById('chat-right');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const replyInfo = document.getElementById('reply-info');

let replyTo = null;

// Ambil chat dari localStorage
const LS_KEY = 'anon_group_chat_messages';
let localMessages = JSON.parse(localStorage.getItem(LS_KEY)) || [];

// Format waktu HH:mm tanpa detik
function formatTime(date) {
  const d = new Date(date);
  return d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

// Render satu pesan
function renderMessage(msg, container, isLocal) {
  const div = document.createElement('div');
  div.classList.add('message');
  div.classList.add(isLocal ? 'right-msg' : 'left-msg');

  let replyText = '';
  if(msg.replyToContent){
    replyText = `<div class="reply">${msg.replyToContent}</div>`;
  }

  div.innerHTML = `
    <div class="username">${msg.username || 'Anon'}</div>
    ${replyText}
    <div class="text">${msg.text}</div>
    <div class="time">${formatTime(msg.createdAt)}</div>
  `;

  // Tombol reply posisinya kiri kalau non localstorage, kanan kalau localstorage
  const replyBtn = document.createElement('button');
  replyBtn.textContent = 'Reply';
  replyBtn.classList.add('reply-btn');
  replyBtn.style.textAlign = isLocal ? 'right' : 'left';
  replyBtn.onclick = () => {
    replyTo = msg._id;
    replyInfo.textContent = `Replying to: "${msg.text.slice(0, 50)}${msg.text.length > 50 ? '...' : ''}"`;
    messageInput.focus();
  };
  div.appendChild(replyBtn);

  container.appendChild(div);
}

// Render semua pesan
function renderAllMessages() {
  chatLeft.innerHTML = '';
  chatRight.innerHTML = '';

  // Non localstorage messages (from server except local ones)
  const nonLocalMsgs = allMessages.filter(m => !localMessages.find(lm => lm._id === m._id));

  nonLocalMsgs.forEach(msg => {
    const replyToMsg = allMessages.find(m => m._id === msg.replyTo);
    if (replyToMsg) msg.replyToContent = replyToMsg.text;
    renderMessage(msg, chatLeft, false);
  });

  // Local messages
  localMessages.forEach(msg => {
    const replyToMsg = allMessages.find(m => m._id === msg.replyTo);
    if (replyToMsg) msg.replyToContent = replyToMsg.text;
    renderMessage(msg, chatRight, true);
  });

  chatLeft.scrollTop = chatLeft.scrollHeight;
  chatRight.scrollTop = chatRight.scrollHeight;
}

// Semua pesan yang diterima dari server
let allMessages = [];
renderAllMessages();

// Kirim pesan ke server dan simpan ke localStorage
function sendMessage() {
  let text = messageInput.value.trim();
  if (!text) return;

  const username = 'Anon'; // Bisa diupgrade jika mau

  socket.emit('sendMessage', { username, text, replyTo });

  // Simpan sementara di localStorage dengan id sementara (negative timestamp)
  const tempId = 'temp_' + Date.now();
  const newMsg = {
    _id: tempId,
    username,
    text,
    createdAt: new Date().toISOString(),
    replyTo
  };
  localMessages.push(newMsg);
  localStorage.setItem(LS_KEY, JSON.stringify(localMessages));

  messageInput.value = '';
  replyTo = null;
  replyInfo.textContent = '';

  renderAllMessages();
}

sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Terima pesan baru dari server
socket.on('newMessage', (msg) => {
  // Jika pesan sudah ada di localStorage, hapus versi local (temp)
  const index = localMessages.findIndex(m => m.text === msg.text && m.createdAt === msg.createdAt);
  if (index !== -1) {
    localMessages.splice(index, 1);
    localStorage.setItem(LS_KEY, JSON.stringify(localMessages));
  }

  allMessages.push(msg);
  renderAllMessages();
});

// Jika ada kata kasar
socket.on('badWordDetected', (msg) => {
  alert(msg);
});
