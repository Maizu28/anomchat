const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const input = document.getElementById("message-input");
const sendMessageButton = chatForm.querySelector("button[type='submit']");

// Inisialisasi koneksi WebSocket
// Gunakan 'wss://' untuk koneksi aman di lingkungan produksi (Railway)
// window.location.host akan otomatis menjadi domain aplikasi Anda di Railway
const socket = new WebSocket(`wss://${window.location.host}`);

// Fungsi untuk memformat timestamp ke WIB (contoh: 09:30)
function formatTimestamp(isoTimestamp) {
    const date = new Date(isoTimestamp);

    // Periksa apakah tanggal valid setelah parsing
    if (isNaN(date.getTime())) {
        return "Waktu invalid";
    }

    const options = {
        timeZone: "Asia/Jakarta", // Ini adalah kunci untuk mendapatkan waktu WIB (UTC+7)
        hour: "2-digit",        // Format jam (misal: 09, 17)
        minute: "2-digit",      // Format menit (misal: 05, 30)
        hourCycle: "h23",       // Menggunakan format 24 jam (00-23)
    };

    let formattedTime = date.toLocaleTimeString("id-ID", options);
    return formattedTime;
}

// Fungsi untuk menampilkan satu pesan ke chatBox
// isOptimistic digunakan untuk menandai pesan yang baru dikirim secara lokal
function displaySingleMessage(message, isOptimistic = false) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message");
    // Asumsi: 'UserLocalAnomChat' adalah username default untuk pengguna lokal Anda
    // Anda mungkin perlu menggantinya dengan username dari sesi pengguna yang sebenarnya
    if (message.username === "UserLocalAnomChat" || message.username === "Anda") {
        messageDiv.classList.add("user-local");
    }
    if (isOptimistic) {
        messageDiv.classList.add("optimistic"); // Tambahkan kelas untuk pesan sementara
    }

    // Elemen untuk teks pesan (username + isi pesan)
    const messageTextElement = document.createElement("p");
    messageTextElement.classList.add("message-text-content");
    // Perhatikan: Properi pesan mungkin 'message_text' atau 'message' tergantung backend Anda
    // Saya gunakan 'message' di sini untuk konsistensi dengan body JSON
    messageTextElement.innerHTML = `<strong>${message.username}:</strong> ${message.message}`;

    // Elemen terpisah untuk waktu pengiriman
    const timestampElement = document.createElement("div");
    timestampElement.classList.add("timestamp");
    timestampElement.textContent = formatTimestamp(message.timestamp);

    // Masukkan kedua elemen ke dalam messageDiv
    messageDiv.appendChild(messageTextElement);
    messageDiv.appendChild(timestampElement);

    chatBox.appendChild(messageDiv);

    // Otomatis scroll ke bawah hanya jika pengguna sudah di paling bawah
    // atau jika pesan yang baru saja ditambahkan adalah pesan optimistik/milik sendiri
    const isScrolledToBottom =
        chatBox.scrollHeight - chatBox.clientHeight <= chatBox.scrollTop + 10; // Toleransi 10px
    if (isScrolledToBottom || isOptimistic || message.username === "Anda") {
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    return messageDiv; // Mengembalikan elemen untuk potensi manipulasi (mis. hapus kelas optimistic)
}

// Fungsi untuk memuat riwayat pesan dari server HTTP
async function loadMessages() {
    try {
        const res = await fetch("/messages"); // Request ke endpoint HTTP di Railway Anda
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        chatBox.innerHTML = ""; // Bersihkan chatBox sebelum memuat ulang pesan
        data.forEach((msg) => {
            displaySingleMessage(msg);
        });
        chatBox.scrollTop = chatBox.scrollHeight; // Pastikan scroll ke bawah setelah load awal
    } catch (error) {
        console.error("Gagal memuat pesan:", error);
        // Tampilkan pesan error yang lebih informatif di UI
        const errorDiv = document.createElement("div");
        errorDiv.classList.add("error-message");
        errorDiv.textContent = "Gagal memuat riwayat pesan. Silakan coba lagi nanti.";
        chatBox.appendChild(errorDiv);
    }
}

// --- WebSocket Event Listeners ---

// Dipanggil saat koneksi WebSocket berhasil dibuka
socket.addEventListener("open", (event) => {
    console.log("Terhubung ke WebSocket server di Railway!");
    loadMessages(); // Muat semua pesan yang ada setelah koneksi terbuka
});

// Dipanggil saat menerima pesan dari server melalui WebSocket
socket.addEventListener("message", (event) => {
    const messageData = JSON.parse(event.data);
    console.log("Pesan diterima via WebSocket:", messageData);
    displaySingleMessage(messageData); // Langsung tampilkan pesan baru
});

// Dipanggil saat koneksi WebSocket tertutup (misalnya, server restart)
socket.addEventListener("close", (event) => {
    console.warn("Koneksi WebSocket terputus:", event.code, event.reason);
    // Coba sambung ulang setelah beberapa waktu
    setTimeout(() => {
        console.log("Mencoba menyambung kembali WebSocket...");
        // Untuk aplikasi yang lebih robust, Anda bisa mencoba inisialisasi ulang `socket`
        // atau refresh halaman jika kehilangan koneksi adalah masalah besar.
        // window.location.reload(); // Mungkin terlalu agresif
    }, 5000); // Coba lagi setelah 5 detik
});

// Dipanggil saat terjadi error pada koneksi WebSocket
socket.addEventListener("error", (event) => {
    console.error("Kesalahan WebSocket:", event);
    // Tampilkan pesan error kepada pengguna jika perlu
});

// --- Event Listener untuk Form Pengiriman Pesan ---

chatForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // Mencegah halaman reload
    const message = input.value.trim();
    if (!message) return; // Jangan kirim pesan kosong

    // Nonaktifkan input dan tombol untuk mencegah pengiriman ganda
    input.disabled = true;
    sendMessageButton.disabled = true;
    sendMessageButton.textContent = "Mengirim...";

    // 1. **Optimistic UI:** Tampilkan pesan secara instan di UI
    // Gunakan username sementara "Anda" untuk pesan yang baru dikirim secara lokal
    const tempMessage = {
        username: "Anda",
        message: message,
        timestamp: new Date().toISOString(), // Gunakan waktu saat ini
    };
    const optimisticMessageDiv = displaySingleMessage(tempMessage, true);
    input.value = ""; // Bersihkan input segera setelah pesan "terkirim"

    try {
        // 2. **Kirim pesan ke server melalui HTTP POST**
        // Ini memastikan pesan tersimpan di database Anda di Railway.
        // Server Anda kemudian harus mendorong pesan ini ke semua klien via WebSocket.
        const res = await fetch("/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message }),
        });

        const result = await res.json();

        if (result.status === "success") {
            // Hapus kelas optimistic setelah konfirmasi dari server.
            // Pesan yang sebenarnya akan datang via WebSocket dan mungkin
            // menggantikan/melengkapi pesan optimistik ini.
            optimisticMessageDiv.classList.remove("optimistic");
            optimisticMessageDiv.classList.add("sent"); // Opsi: tambahkan kelas 'sent'
        } else {
            // Jika ada error dari server, tandai pesan sebagai gagal
            alert(result.message || "Gagal mengirim pesan");
            optimisticMessageDiv.classList.add("failed");
            optimisticMessageDiv.title = result.message || "Pengiriman gagal";
        }
    } catch (error) {
        // Tangani error jaringan
        console.error("Error saat mengirim pesan:", error);
        alert("Terjadi kesalahan jaringan atau server saat mengirim pesan.");
        optimisticMessageDiv.classList.add("failed");
        optimisticMessageDiv.title = "Kesalahan jaringan/server";
    } finally {
        // Aktifkan kembali input dan tombol setelah proses selesai
        input.disabled = false;
        sendMessageButton.disabled = false;
        sendMessageButton.textContent = "Kirim";
        input.focus(); // Fokuskan kembali input agar pengguna bisa langsung mengetik lagi
    }
});

// --- Inisialisasi Awal ---
// `loadMessages()` akan dipanggil saat koneksi WebSocket `open`.
// Jika Anda ingin memuat pesan bahkan sebelum WebSocket terhubung:
// window.onload = loadMessages; // Uncomment jika ini yang Anda inginkan
