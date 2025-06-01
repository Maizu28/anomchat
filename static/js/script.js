const chatBox = document.getElementById('chat-box');
const chatForm = document.getElementById('chat-form');
const input = document.getElementById('message-input');

async function loadMessages() {
    const res = await fetch('/messages');
    const data = await res.json();
    chatBox.innerHTML = '';
    data.forEach(msg => {
        const div = document.createElement('div');
        div.classList.add('message');
        div.innerText = `${msg.username}: ${msg.message} (${msg.timestamp})`;
        chatBox.appendChild(div);
    });
    chatBox.scrollTop = chatBox.scrollHeight;
}

chatForm.addEventListener('submit', async e => {
    e.preventDefault();
    const message = input.value.trim();
    if (!message) return;
    await fetch('/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
    });
    input.value = '';
    loadMessages();
});


chatForm.addEventListener('submit', async e => {
    e.preventDefault();
    const message = input.value.trim();
    if (!message) return;

    const res = await fetch('/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
    });

    const result = await res.json();
    if (result.status === 'success') {
        input.value = '';
        loadMessages();
    } else {
        alert(result.message || 'Gagal mengirim pesan');
    }
});

setInterval(loadMessages, 3000);
window.onload = loadMessages;