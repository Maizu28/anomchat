const socket = io();
const chatBox = document.getElementById('chatBox');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');

const user = 'Anon-' + Math.floor(Math.random() * 1000);

function addMessage({ user: sender, text }) {
  const div = document.createElement('div');
  div.classList.add('message');
  if (sender !== user) div.classList.add('other');
  div.textContent = `${sender}: ${text}`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (text) {
    const data = { user, text };
    socket.emit('send_message', data);
    messageInput.value = '';
  }
});

socket.on('receive_message', (data) => {
  addMessage(data);
});
