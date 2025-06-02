const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const input = document.getElementById("message-input"); // Ini adalah textarea
const sendMessageButton = chatForm.querySelector(".send-button"); // Selector disesuaikan

// Inisialisasi koneksi WebSocket
const socket = new WebSocket(`wss://${window.location.host}`);

// Fungsi untuk memformat timestamp ke WIB (contoh: 09:30)
function formatTimestamp(isoTimestamp) {
    const date = new Date(isoTimestamp);
    if (isNaN(date.getTime())) {
        return "Waktu invalid";
    }
    const options = {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    };
    return date.toLocaleTimeString("id-ID", options);
}

// Fungsi untuk menampilkan satu pesan ke chatBox
function displaySingleMessage(message, isOptimistic = false) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message");
    // Asumsi "Anda" untuk pesan lokal. Sesuaikan jika Anda punya sistem identifikasi pengguna.
    if (message.username === "Anda") {
        messageDiv.classList.add("user-local");
    }
    if (isOptimistic) {
        messageDiv.classList.add("optimistic"); // Tambahkan kelas untuk pesan sementara
    }

    const messageTextElement = document.createElement("p");
    messageTextElement.classList.add("message-text-content");
    messageTextElement.innerHTML = `<strong>${message.username}:</strong> ${message.message}`;

    const timestampElement = document.createElement("div");
    timestampElement.classList.add("timestamp");
    timestampElement.textContent = formatTimestamp(message.timestamp);

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
    return messageDiv;
}

// Fungsi untuk memuat riwayat pesan dari server HTTP
async function loadMessages() {
    try {
        const res = await fetch("/messages");
        if (!res.ok) {
            // Jika respons tidak OK (misal 404, 500), lempar error
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        chatBox.innerHTML = ""; // Bersihkan chatBox sebelum memuat ulang pesan
        data.forEach((msg) => {
            displaySingleMessage(msg);
        });
        chatBox.scrollTop = chatBox.scrollHeight; // Pastikan scroll ke bawah setelah load awal
    } catch (error) {
        console.error("Gagal memuat riwayat pesan:", error);
        const errorDiv = document.createElement("div");
        errorDiv.classList.add("error-message");
        errorDiv.textContent = "Gagal memuat riwayat pesan. Silakan coba lagi nanti.";
        chatBox.appendChild(errorDiv);
    }
}

// --- WebSocket Event Listeners ---
socket.addEventListener("open", (event) => {
    console.log("Terhubung ke WebSocket server di Railway!");
    // Muat pesan hanya setelah koneksi WebSocket berhasil terbuka
    // Ini memastikan kita tidak meminta riwayat chat sebelum koneksi real-time siap
    loadMessages();
});

// Event ini akan menerima pesan dari orang lain (yang dibroadcast oleh backend)
socket.addEventListener("message", (event) => {
    const messageData = JSON.parse(event.data);
    console.log("Pesan diterima via WebSocket:", messageData);
    // Asumsi: Backend mengirim pesan yang sama seperti format di `displaySingleMessage`
    // Jika backend menyertakan `username` sendiri untuk pesan Anda, pastikan `displaySingleMessage`
    // dapat membedakan antara pesan Anda dan pesan orang lain.
    // Misal: Jika backend mengirim `username: "YourActualUsername"`, pastikan `if (message.username === "Anda")`
    // dapat menangani itu, atau ubah `username` pada `tempMessage` di `submit` event menjadi `YourActualUsername`.
    displaySingleMessage(messageData);
});

socket.addEventListener("close", (event) => {
    console.warn("Koneksi WebSocket terputus:", event.code, event.reason);
    // Implementasi rekoneksi otomatis bisa ditambahkan di sini
    setTimeout(() => {
        console.log("Mencoba menyambung kembali WebSocket...");
        // Untuk aplikasi produksi, Anda bisa mencoba membuat instance WebSocket baru di sini
        // atau mungkin menampilkan pesan kepada pengguna bahwa koneksi terputus.
        // window.location.reload(); // Mungkin terlalu agresif
    }, 5000);
});

socket.addEventListener("error", (event) => {
    console.error("Kesalahan WebSocket:", event);
    // Tampilkan pesan error kepada pengguna jika perlu
});

// --- Penyesuaian Tinggi Textarea Otomatis dan Status Tombol Kirim ---
function adjustTextareaHeight() {
    // Reset tinggi untuk menghitung ulang
    input.style.height = 'auto';
    // Set tinggi berdasarkan scrollHeight (tinggi konten)
    input.style.height = input.scrollHeight + 'px';

    // Batasi tinggi maksimum untuk mencegah textarea terlalu besar
    const maxHeight = parseFloat(getComputedStyle(input).maxHeight);
    if (input.scrollHeight > maxHeight) {
        input.style.overflowY = 'scroll'; // Tampilkan scrollbar jika melebihi batas
    } else {
        input.style.overflowY = 'hidden'; // Sembunyikan scrollbar
    }

    // Mengatur status tombol kirim (disabled/enabled)
    if (input.value.trim() === '') {
        sendMessageButton.disabled = true;
        sendMessageButton.style.backgroundColor = '#b0b0b0'; // Warna disabled
    } else {
        sendMessageButton.disabled = false;
        sendMessageButton.style.backgroundColor = 'var(--whatsapp-light-green)'; // Warna aktif
    }
}

// Event listener untuk input pada textarea (memanggil adjustTextareaHeight setiap ada ketikan)
input.addEventListener('input', adjustTextareaHeight);

// Panggil sekali saat DOM dimuat untuk set tinggi awal textarea dan status tombol kirim
document.addEventListener('DOMContentLoaded', adjustTextareaHeight);

// --- Event Listener untuk Form Pengiriman Pesan ---
chatForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // Mencegah halaman reload saat form disubmit
    const message = input.value.trim();

    // Jangan lakukan apapun jika pesan kosong
    if (!message) return;

    // --- Langkah 1: Nonaktifkan input dan tombol saat mengirim untuk UX yang lebih baik ---
    input.disabled = true;
    sendMessageButton.disabled = true;
    sendMessageButton.innerHTML = '⏳'; // Menampilkan ikon loading

    // --- Langkah 2: Tampilkan pesan secara optimistik (segera di UI) ---
    // Asumsi username adalah "Anda". Anda bisa mendapatkan username aktual dari sesi pengguna jika ada.
    const tempMessage = {
        username: "Anda", // Ini adalah username yang ditampilkan di frontend untuk pesan Anda
        message: message,
        timestamp: new Date().toISOString(),
    };
    const optimisticMessageDiv = displaySingleMessage(tempMessage, true); // `true` menandakan pesan optimistik
    input.value = ""; // Bersihkan input segera
    adjustTextareaHeight(); // Sesuaikan kembali tinggi textarea setelah input dikosongkan

    try {
        // --- Langkah 3: Kirim pesan ke server melalui HTTP POST ---
        // Ini adalah endpoint backend Anda yang akan menyimpan pesan ke database.
        // PENTING: Backend Anda HARUS membroadcast pesan ini (setelah disimpan)
        // ke SEMUA klien yang terhubung melalui WebSocket.
        const res = await fetch("/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message }), // Mengirim pesan sebagai payload JSON
        });

        const result = await res.json(); // Menguraikan respons JSON dari server

        if (result.status === "success") {
            // Pesan berhasil dikirim ke server.
            // Kita tidak perlu displaySingleMessage lagi di sini
            // karena pesan yang sudah tersimpan akan datang kembali melalui WebSocket
            // (yang akan ditangani oleh socket.addEventListener("message")).
            // optimisticMessageDiv.classList.remove("optimistic");
            // optimisticMessageDiv.classList.add("sent");
            // KODE DI ATAS DIKOMENTARI KARENA PESAN FINAL AKAN DATANG DARI WEBSOCKET
            // DAN KITA TIDAK INGIN DUPLIKASI ATAU INKONSISTENSI STATUS.
        } else {
            // Jika ada masalah dari server (tapi bukan error jaringan)
            alert(result.message || "Gagal mengirim pesan");
            optimisticMessageDiv.classList.add("failed"); // Menandai pesan gagal
            optimisticMessageDiv.title = result.message || "Pengiriman gagal";
        }
    } catch (error) {
        // --- Langkah 4: Tangani error jaringan atau server ---
        console.error("Error saat mengirim pesan:", error);
        alert("Terjadi kesalahan jaringan atau server saat mengirim pesan.");
        optimisticMessageDiv.classList.add("failed");
        optimisticMessageDiv.title = "Kesalahan jaringan/server";
    } finally {
        // --- Langkah 5: Selalu aktifkan kembali UI setelah proses selesai ---
        input.disabled = false;
        // Tombol kirim akan diatur oleh adjustTextareaHeight berdasarkan input.value
        adjustTextareaHeight(); // Memastikan tombol kirim kembali ke kondisi benar
        input.focus(); // Fokuskan kembali input agar pengguna bisa langsung mengetik lagi
    }
});