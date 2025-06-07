const socket = io();
const chatBox = document.getElementById("chat-box");

socket.on('receive_message', msg => {
  const div = document.createElement("div");
  div.textContent = `[${msg.timestamp}] ${msg.username}: ${msg.content}`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
});

document.getElementById("chat-form").addEventListener("submit", e => {
  e.preventDefault();
  const input = document.getElementById("message-input");
  const content = input.value.trim();
  if (content) {
    socket.emit('send_message', { content });
    input.value = "";
  }
});
