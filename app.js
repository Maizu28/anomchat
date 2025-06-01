// GANTI DENGAN URL PROYEK DAN ANON KEY SUPABASE ANDA
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // Contoh: 'https://abcdefghijklmnop.supabase.co'
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Contoh: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9. ... . ...'

// Cek apakah konstanta sudah diisi
if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    alert("PENTING: Harap ganti YOUR_SUPABASE_URL dan YOUR_SUPABASE_ANON_KEY di app.js dengan kredensial Supabase Anda!");
}

const { createClient } = supabase; // Ambil createClient dari global Supabase yang di-load via CDN
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Elemen DOM
const nicknameInput = document.getElementById('nickname');
const setNicknameButton = document.getElementById('setNickname');
const messagesArea = document.getElementById('messages-area');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const loadingPlaceholder = document.querySelector('.loading-placeholder');
const statusIndicator = document.getElementById('statusIndicator');

let currentNickname = localStorage.getItem('chatAppAnonNickname') || '';
nicknameInput.value = currentNickname;
let messageSubscription = null;

function updateStatus(message, isError = false) {
    statusIndicator.textContent = message;
    statusIndicator.style.color = isError ? '#d32f2f' : '#65676b'; // Merah untuk error
}

function enableChat() {
    messageInput.disabled = false;
    sendButton.disabled = false;
    nicknameInput.disabled = true;
    setNicknameButton.textContent = 'Nickname Terpasang';
    setNicknameButton.disabled = true;
    updateStatus(`Chat sebagai: ${currentNickname}`);
}

function disableChat() {
    messageInput.disabled = true;
    sendButton.disabled = true;
    nicknameInput.disabled = false;
    setNicknameButton.textContent = 'Set Nickname';
    setNicknameButton.disabled = false;
    updateStatus('Set nickname untuk memulai chat.');
}

setNicknameButton.addEventListener('click', () => {
    const nickname = nicknameInput.value.trim();
    if (nickname && nickname.length >= 3) {
        currentNickname = nickname;
        localStorage.setItem('chatAppAnonNickname', currentNickname);
        enableChat();
        if (!messageSubscription) { // Hanya subscribe jika belum ada atau setelah disconnect
            fetchInitialMessagesAndSubscribe();
        }
    } else {
        alert('Nickname minimal 3 karakter dan tidak boleh kosong!');
    }
});

// Mengirim pesan
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});

async function sendMessage() {
    const text = messageInput.value.trim();
    if (text && currentNickname) {
        try {
            const { error } = await supabaseClient
                .from('messages')
                .insert([{ nickname: currentNickname, text: text }]);

            if (error) {
                console.error('Error sending message:', error);
                updateStatus(`Gagal mengirim: ${error.message}`, true);
                return;
            }
            messageInput.value = '';
        } catch (err) {
            console.error('Supabase client error on send:', err);
            updateStatus(`Kesalahan klien: ${err.message}`, true);
        }
    } else if (!currentNickname) {
        alert("Silakan set nickname Anda terlebih dahulu.");
    }
}

// Menampilkan satu pesan ke UI
function displayMessage(message) {
    if (loadingPlaceholder) {
        loadingPlaceholder.style.display = 'none'; // Sembunyikan placeholder jika ada pesan
    }

    const messageElement = document.createElement('div');
    messageElement.classList.add('message');

    if (message.nickname === currentNickname) {
        messageElement.classList.add('sent');
    } else {
        messageElement.classList.add('received');
    }

    const senderElement = document.createElement('div');
    senderElement.classList.add('sender');
    senderElement.textContent = message.nickname;

    const textElement = document.createElement('div');
    textElement.classList.add('text');
    textElement.textContent = message.text; // Aman dari XSS dasar karena textContent

    const timestampElement = document.createElement('div');
    timestampElement.classList.add('timestamp');
    if (message.created_at) {
        timestampElement.textContent = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    messageElement.appendChild(senderElement);
    messageElement.appendChild(textElement);
    messageElement.appendChild(timestampElement);
    messagesArea.appendChild(messageElement);
}

function scrollToBottom() {
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

// Mengambil pesan awal dan mulai berlangganan (subscribe) pesan baru
async function fetchInitialMessagesAndSubscribe() {
    if (!currentNickname) {
        updateStatus("Set nickname untuk melihat pesan.");
        return;
    }
    if (messageSubscription) { // Hindari multiple subscriptions
        console.log("Sudah ada subscription aktif.");
        return;
    }

    updateStatus("Mengambil riwayat pesan...");
    messagesArea.innerHTML = ''; // Bersihkan pesan lama sebelum memuat yang baru
    if (loadingPlaceholder) messagesArea.appendChild(loadingPlaceholder);


    try {
        // Ambil 50 pesan terakhir sebagai riwayat awal
        const { data: messages, error } = await supabaseClient
            .from('messages')
            .select('*')
            .order('created_at', { ascending: true }) // ascending true agar pesan lama di atas
            .limit(50);

        if (error) {
            console.error('Error fetching initial messages:', error);
            updateStatus(`Gagal ambil riwayat: ${error.message}`, true);
            if (loadingPlaceholder) loadingPlaceholder.textContent = `Gagal memuat: ${error.message}`;
            return;
        }

        if (messages && messages.length > 0) {
             messages.forEach(displayMessage);
        } else {
            if (loadingPlaceholder) loadingPlaceholder.textContent = 'Belum ada pesan.';
        }
        scrollToBottom();
        updateStatus(`Terhubung sebagai ${currentNickname}. Menunggu pesan...`);

        // Langganan Realtime untuk pesan baru
        messageSubscription = supabaseClient
            .channel('public:messages') // Nama channel bebas, 'public:nama_tabel' adalah konvensi
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                (payload) => {
                    console.log('Pesan baru (realtime):', payload.new);
                    displayMessage(payload.new);
                    scrollToBottom();
                }
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Berhasil subscribe ke Supabase Realtime!');
                    updateStatus(`Terhubung & siap menerima pesan sebagai ${currentNickname}.`);
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.error('Supabase Realtime subscription error:', status, err);
                    updateStatus(`Kesalahan koneksi realtime: ${status}. Coba refresh.`, true);
                    // Mungkin perlu logic untuk re-subscribe atau memberitahu pengguna
                } else if (status === 'CLOSED') {
                    console.log('Supabase Realtime subscription closed.');
                    updateStatus('Koneksi realtime ditutup.', true);
                    messageSubscription = null; // Reset agar bisa subscribe lagi
                }
            });

    } catch (err) {
        console.error('Supabase client error on fetch/subscribe:', err);
        updateStatus(`Kesalahan klien: ${err.message}`, true);
        if (loadingPlaceholder) loadingPlaceholder.textContent = `Kesalahan klien: ${err.message}`;
    }
}

// Inisialisasi saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    if (currentNickname) {
        enableChat();
        fetchInitialMessagesAndSubscribe(); // Langsung subscribe jika nickname sudah ada
    } else {
        disableChat();
        if (loadingPlaceholder) loadingPlaceholder.textContent = 'Set nickname untuk memulai.';
    }
});

// Membersihkan subscription saat halaman ditutup (opsional, tapi praktik yang baik)
window.addEventListener('beforeunload', () => {
    if (messageSubscription) {
        supabaseClient.removeChannel(messageSubscription);
        console.log("Subscription dihentikan.");
    }
});