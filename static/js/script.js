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
    if (message.username === "Anda") { // Asumsi "Anda" untuk pesan lokal
        messageDiv.classList.add("user-local");
    }
    if (isOptimistic) {
        messageDiv.classList.add("optimistic");
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

    const isScrolledToBottom =
        chatBox.scrollHeight - chatBox.clientHeight <= chatBox.scrollTop + 10;
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
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        chatBox.innerHTML = "";
        data.forEach((msg) => {
            displaySingleMessage(msg);
        });
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (error) {
        console.error("Gagal memuat pesan:", error);
        const errorDiv = document.createElement("div");
        errorDiv.classList.add("error-message");
        errorDiv.textContent = "Gagal memuat riwayat pesan. Silakan coba lagi nanti.";
        chatBox.appendChild(errorDiv);
    }
}

// --- WebSocket Event Listeners ---
socket.addEventListener("open", (event) => {
    console.log("Terhubung ke WebSocket server di Railway!");
    loadMessages();
});

socket.addEventListener("message", (event) => {
    const messageData = JSON.parse(event.data);
    console.log("Pesan diterima via WebSocket:", messageData);
    displaySingleMessage(messageData);
});

socket.addEventListener("close", (event) => {
    console.warn("Koneksi WebSocket terputus:", event.code, event.reason);
    setTimeout(() => {
        console.log("Mencoba menyambung kembali WebSocket...");
    }, 5000);
});

socket.addEventListener("error", (event) => {
    console.error("Kesalahan WebSocket:", event);
});

// --- Penyesuaian Tinggi Textarea Otomatis ---
function adjustTextareaHeight() {
    input.style.height = 'auto'; // Reset tinggi
    input.style.height = input.scrollHeight + 'px'; // Atur tinggi sesuai konten

    // Batasi tinggi maksimum
    const maxHeight = parseFloat(getComputedStyle(input).maxHeight);
    if (input.scrollHeight > maxHeight) {
        input.style.overflowY = 'scroll';
    } else {
        input.style.overflowY = 'hidden';
    }

    // Tombol kirim selalu aktifkan/nonaktifkan berdasarkan isi input
    // Ini menggantikan logika voice note/send button
    if (input.value.trim() === '') {
        sendMessageButton.disabled = true;
        sendMessageButton.style.backgroundColor = '#b0b0b0'; // Warna disabled
    } else {
        sendMessageButton.disabled = false;
        sendMessageButton.style.backgroundColor = 'var(--whatsapp-light-green)'; // Warna aktif
    }
}

// Event listener untuk input pada textarea
input.addEventListener('input', adjustTextareaHeight);

// Panggil sekali saat dimuat untuk set tinggi awal dan ikon
document.addEventListener('DOMContentLoaded', adjustTextareaHeight);


// --- Event Listener untuk Form Pengiriman Pesan ---
chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = input.value.trim();
    if (!message) return; // Jangan kirim pesan kosong

    // Nonaktifkan input dan tombol saat mengirim
    

    const tempMessage = {
        username: "Anda",
        message: message,
        timestamp: new Date().toISOString(),
    };
    const optimisticMessageDiv = displaySingleMessage(tempMessage, true);
    input.value = ""; // Bersihkan input segera
    adjustTextareaHeight(); // Sesuaikan kembali tinggi textarea setelah input dikosongkan

    try {
        const res = await fetch("/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message }),
        });

        const result = await res.json();

        if (result.status === "success") {
            optimisticMessageDiv.classList.remove("optimistic");
            optimisticMessageDiv.classList.add("sent");
        } else {
            alert(result.message || "Gagal mengirim pesan");
            optimisticMessageDiv.classList.add("failed");
            optimisticMessageDiv.title = result.message || "Pengiriman gagal";
        }
    } catch (error) {
        console.error("Error saat mengirim pesan:", error);
        alert("Terjadi kesalahan jaringan atau server saat mengirim pesan.");
        optimisticMessageDiv.classList.add("failed");
        optimisticMessageDiv.title = "Kesalahan jaringan/server";
    } finally {
        input.disabled = false;
        // Tombol kirim akan diatur oleh adjustTextareaHeight berdasarkan input.value
        adjustTextareaHeight(); // Memastikan tombol kirim kembali ke kondisi benar
        input.focus();
    }
});
