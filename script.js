// Ganti dengan kredensial Pusher Anda
const PUSHER_APP_KEY = 'GANTI_DENGAN_APP_KEY_ANDA';
const PUSHER_APP_CLUSTER = 'GANTI_DENGAN_CLUSTER_ANDA';

const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const nicknameInput = document.getElementById('nickname');

let userNickname = `User-${Math.random().toString(36).substring(2, 7)}`;

// Inisialisasi Pusher
const pusher = new Pusher(PUSHER_APP_KEY, {
    cluster: PUSHER_APP_CLUSTER,
    encrypted: true
});

// Langganan ke channel
const channelName = 'anonymous-chat'; // Bisa diganti jika mau
const channel = pusher.subscribe(channelName);

// Fungsi untuk menampilkan pesan
function displayMessage(data, type = 'received') {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', type);

    const senderSpan = document.createElement('span');
    senderSpan.classList.add('sender');
    senderSpan.textContent = `${data.nickname || 'Anonymous'}: `;

    const contentSpan = document.createElement('span');
    contentSpan.textContent = data.message;

    if (type !== 'system') {
        messageElement.appendChild(senderSpan);
    }
    messageElement.appendChild(contentSpan);
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight; // Auto scroll ke bawah
}

// Tangani pesan masuk dari Pusher
channel.bind('new-message', function(data) {
    // Cek agar tidak menampilkan pesan sendiri dua kali jika kita yang mengirim
    // Ini bisa lebih canggih, tapi untuk sekarang cukup
    if (data.senderId !== pusher.sessionID || (nicknameInput.value && data.nickname !== nicknameInput.value)) {
        displayMessage(data, 'received');
    }
});

// Tangani event ketika user bergabung (opsional, lebih kompleks dengan Pusher Presence Channels)
// Untuk kesederhanaan, kita tidak implementasi ini secara penuh.
// channel.bind('pusher:member_added', (member) => {
//     displayMessage({ message: `${member.info.nickname || 'Someone'} joined.` }, 'system');
// });

// channel.bind('pusher:member_removed', (member) => {
//     displayMessage({ message: `${member.info.nickname || 'Someone'} left.` }, 'system');
// });


// Kirim pesan
async function sendMessage() {
    const message = messageInput.value.trim();
    const nickname = nicknameInput.value.trim() || userNickname;

    if (message === '') return;

    const messageData = {
        nickname: nickname,
        message: message,
        senderId: pusher.sessionID // ID sesi Pusher untuk identifikasi pengirim (opsional)
    };

    try {
        // Kirim pesan ke server (Netlify Function) untuk di-broadcast oleh Pusher
        const response = await fetch('/.netlify/functions/send-message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messageData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error sending message:', errorData);
            displayMessage({ message: `Error: ${errorData.message || 'Could not send message.'}` }, 'system');
            return;
        }
        // Tampilkan pesan sendiri langsung (optimistic update)
        displayMessage(messageData, 'sent');
        messageInput.value = '';

    } catch (error) {
        console.error('Failed to send message:', error);
        displayMessage({ message: 'Error: Could not connect to send service.' }, 'system');
    }
}

sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

nicknameInput.addEventListener('change', () => {
    if (nicknameInput.value.trim()) {
        userNickname = nicknameInput.value.trim();
        // Anda bisa mengirim event perubahan nickname jika diinginkan
        // displayMessage({ message: `You are now known as ${userNickname}` }, 'system');
    }
});

// Pesan selamat datang sederhana
displayMessage({ message: 'Welcome to the anonymous chat! Be respectful.' }, 'system');
console.log("Chat initialized. Your temporary ID if no nickname: " + userNickname);
console.log("Pusher session ID:", pusher.sessionID);