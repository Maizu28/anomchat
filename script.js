const API_URL = "https://your-backend-url.com"; // Ganti setelah backend online
const chatBox = document.getElementById("chat-box");
const input = document.getElementById("message");

let username = localStorage.getItem("anon_name");
if (!username) {
  username = "User" + Math.floor(Math.random() * 1000);
  localStorage.setItem("anon_name", username);
}

function createMessageHTML(msg) {
  const isMe = msg.sender === username;
  return `
    <div class="message ${isMe ? 'outgoing' : 'incoming'}">
      ${!isMe ? `<strong>${msg.sender}</strong><br>` : ""}
      ${msg.text}
    </div>
  `;
}

async function fetchMessages() {
  const res = await fetch(`${API_URL}/messages`);
  const data = await res.json();
  chatBox.innerHTML = data.map(createMessageHTML).join("");
  chatBox.scrollTop = chatBox.scrollHeight;
}

document.getElementById("chat-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  await fetch(`${API_URL}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, sender: username })
  });
  input.value = "";
  fetchMessages();
});

setInterval(fetchMessages, 3000);
fetchMessages();
