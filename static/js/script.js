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

// --- Penyesuaian Tinggi Textarea Otomatis dan Status Tombol Kirim ---
function adjustTextareaHeight() {
	// Reset tinggi untuk menghitung ulang
	input.style.height = "auto";
	// Set tinggi berdasarkan scrollHeight (tinggi konten)
	input.style.height = input.scrollHeight + "px";

	// Batasi tinggi maksimum untuk mencegah textarea terlalu besar
	const maxHeight = parseFloat(getComputedStyle(input).maxHeight);
	if (input.scrollHeight > maxHeight) {
		input.style.overflowY = "scroll"; // Tampilkan scrollbar jika melebihi batas
	} else {
		input.style.overflowY = "hidden"; // Sembunyikan scrollbar
	}

	// Mengatur status tombol kirim (disabled/enabled)
	if (input.value.trim() === "") {
		sendMessageButton.disabled = true;
		sendMessageButton.style.backgroundColor = "#b0b0b0"; // Warna disabled
	} else {
		sendMessageButton.disabled = false;
		sendMessageButton.style.backgroundColor = "var(--whatsapp-light-green)"; // Warna aktif
	}
}

// Event listener untuk input pada textarea (memanggil adjustTextareaHeight setiap ada ketikan)
input.addEventListener("input", adjustTextareaHeight);

// Panggil sekali saat DOM dimuat untuk set tinggi awal textarea dan status tombol kirim
document.addEventListener("DOMContentLoaded", adjustTextareaHeight);

// --- Event Listener untuk Form Pengiriman Pesan ---
chatForm.addEventListener("submit", async (e) => {
	e.preventDefault(); // Mencegah halaman reload saat form disubmit
	const message = input.value.trim();

	// Jangan lakukan apapun jika pesan kosong
	if (!message) return;

	// --- Langkah 1: Nonaktifkan input dan tombol saat mengirim untuk UX yang lebih baik ---
	input.disabled = true;
	sendMessageButton.disabled = true;
	// sendMessageButton.innerHTML = '⏳'; // Menghapus baris ini untuk menghilangkan ikon loading

	// --- Langkah 2: Tampilkan pesan secara optimistik (segera di UI) ---
	const tempMessage = {
		username: "Anda",
		message: message,
		timestamp: new Date().toISOString(),
	};
	const optimisticMessageDiv = displaySingleMessage(tempMessage, true);
	input.value = ""; // Bersihkan input segera
	adjustTextareaHeight(); // Sesuaikan kembali tinggi textarea setelah input dikosongkan

	try {
		// --- Langkah 3: Kirim pesan ke server melalui HTTP POST ---
		const res = await fetch("/send", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ message }),
		});

		const result = await res.json();

		if (result.status === "success") {
			// Biarkan pesan datang dari WebSocket untuk sumber kebenaran
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
		// --- Langkah 5: Selalu aktifkan kembali UI setelah proses selesai ---
		input.disabled = false;
		// Tombol kirim akan diatur oleh adjustTextareaHeight berdasarkan input.value
		adjustTextareaHeight(); // Memastikan tombol kirim kembali ke kondisi benar
		input.focus();
	}
});
