const socket = io();

const messages = document.getElementById('messages');
const input = document.getElementById('m');
const sendButton = document.getElementById('send');
const replyPreview = document.getElementById('reply-preview');
const replyUsernameSpan = document.getElementById('reply-username');
const replyMessageTextSpan = document.getElementById('reply-message-text');
const clearReplyButton = document.getElementById('clear-reply');

let replyToMessage = null; // Untuk menyimpan pesan yang sedang dibalas

// Fungsi untuk membuat username anonim acak
function generateAnonymousUsername() {
    const adjectives = ['Senang', 'Sedih', 'Berani', 'Baik', 'Bijak', 'Cerdik', 'Energik'];
    const nouns = ['Pengguna', 'Penjelajah', 'Pencari', 'Pemimpi', 'Pelopor', 'Pengamat'];
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${randomAdjective} ${randomNoun}`;
}

// Dapatkan username dari localStorage atau buat yang baru
let username = localStorage.getItem('anonymousUsername');
if (!username) {
    username = generateAnonymousUsername();
    localStorage.setItem('anonymousUsername', username);
}

// Fungsi untuk menambahkan pesan ke chat
function appendMessage(data) {
    const item = document.createElement('div');
    item.classList.add('message-bubble');

    // Tentukan apakah pesan ini dari pengguna lokal (Anda) atau bukan
    const isCurrentLocalUser = data.username === username;
    if (isCurrentLocalUser) {
        item.classList.add('local-user'); // Pesan Anda akan di kanan
    } else {
        item.classList.add('non-local-user'); // Pesan orang lain akan di kiri
    }

    let messageContent = '';
    if (data.replyTo && data.replyTo.message) {
        messageContent += `
            <div class="reply-container">
                <p>Membalas: <span class="reply-username">${data.replyTo.username === username ? 'Anda' : data.replyTo.username}</span></p>
                <p class="reply-message-text">${data.replyTo.message}</p>
            </div>
        `;
    }

    messageContent += `<div class="message-username">${data.username === username ? 'Anda' : data.username}</div>`;
    messageContent += `<div class="message-text">${data.message}</div>`;
    const messageDate = new Date(data.timestamp);
    const timeString = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    messageContent += `<div class="message-timestamp">${timeString}</div>`;

    item.innerHTML = messageContent;

    // Tambahkan tombol balasan
    const replyButton = document.createElement('button');
    replyButton.classList.add('reply-button');
    replyButton.textContent = 'Balas';
    replyButton.onclick = () => {
        replyToMessage = {
            username: data.username,
            message: data.message,
            isLocalUser: data.isLocalUser // Simpan status lokal untuk balasan
        };
        replyUsernameSpan.textContent = data.username === username ? 'Anda' : data.username;
        replyMessageTextSpan.textContent = data.message;
        replyPreview.style.display = 'flex';
        input.focus();
    };
    item.appendChild(replyButton);

    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight; // Gulir ke bawah otomatis
}

// Muat pesan lama dari server saat pertama kali terhubung
socket.on('load old messages', (msgs) => {
    msgs.forEach(msg => {
        appendMessage(msg);
    });
});

// Tangani pesan chat yang masuk secara real-time
socket.on('chat message', (msg) => {
    appendMessage(msg);
});

// Fungsi untuk mengirim pesan
function sendMessage() {
    if (input.value.trim()) { // Pastikan input tidak kosong
        const messageData = {
            username: username,
            message: input.value.trim(),
            isLocalUser: true, // Tandai pesan yang dikirim dari klien ini sebagai lokal
            replyTo: replyToMessage // Akan null jika bukan balasan
        };
        socket.emit('chat message', messageData); // Kirim pesan ke server
        input.value = ''; // Kosongkan input
        replyToMessage = null; // Hapus status balasan
        replyPreview.style.display = 'none'; // Sembunyikan pratinjau balasan
    }
}

// Kirim pesan saat tombol 'Kirim' diklik
sendButton.addEventListener('click', sendMessage);

// Kirim pesan saat tombol 'Enter' ditekan pada input
input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault(); // Mencegah baris baru di input
        sendMessage();
    }
});

// Hapus status balasan saat tombol 'X' pada pratinjau balasan diklik
clearReplyButton.addEventListener('click', () => {
    replyToMessage = null;
    replyPreview.style.display = 'none';
});