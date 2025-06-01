const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const input = document.getElementById("message-input");

async function loadMessages() {
	const res = await fetch("/messages");
	const data = await res.json();
	chatBox.innerHTML = "";
	data.forEach((msg) => {
		const div = document.createElement("div");
		div.classList.add("message");
		div.innerText = `${msg.username}:\n${msg.message}\n(${msg.timestamp})`;
		chatBox.appendChild(div);
	});
	chatBox.scrollTop = chatBox.scrollHeight;
}

chatForm.addEventListener("submit", async (e) => {
	e.preventDefault();
	const message = input.value.trim();
	if (!message) return;

	const res = await fetch("/send", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ message }),
	});

	const result = await res.json();

	if (result.status === "success") {
		input.value = "";
		loadMessages();
	} else {
		alert(result.message || "Gagal mengirim pesan");
	}
});

function displayMessages(messages) {
	// ... (kode lain)
	messages.forEach((message) => {
		const messageDiv = document.createElement("div");
		messageDiv.classList.add("message");
		if (message.username === "UserLocalAnomChat") {
			// Sesuaikan dengan cara identifikasi pengguna lokal Anda
			messageDiv.classList.add("user-local");
		}

		// 1. Buat elemen untuk teks pesan (username + isi pesan)
		const messageTextElement = document.createElement("p");
		messageTextElement.classList.add("message-text-content"); // Tambahkan kelas jika perlu styling khusus
		messageTextElement.innerHTML = `<strong>${message.username}:</strong> ${message.message_text}`;

		// 2. Buat elemen terpisah untuk waktu pengiriman
		const timestampElement = document.createElement("div"); // Gunakan <div> agar defaultnya block
		timestampElement.classList.add("timestamp");
		timestampElement.textContent = formatTimestamp(message.timestamp); // formatTimestamp adalah fungsi Anda

		// 3. Masukkan kedua elemen ke dalam messageDiv
		messageDiv.appendChild(messageTextElement);
		messageDiv.appendChild(timestampElement); // Timestamp akan berada di bawah messageTextElement

		chatBox.appendChild(messageDiv);
	});
	function formatTimestamp(isoTimestamp) {
		const date = new Date(isoTimestamp);

		// Periksa apakah tanggal valid setelah parsing
		if (isNaN(date.getTime())) {
			return "Waktu invalid"; // Atau penanganan error lainnya
		}

		const options = {
			timeZone: "Asia/Jakarta", // Ini adalah kunci untuk mendapatkan waktu WIB (UTC+7)
			hour: "2-digit", // Format jam (misal: 09, 17)
			minute: "2-digit", // Format menit (misal: 05, 30)
			// second: '2-digit',     // Aktifkan jika ingin menampilkan detik
			hourCycle: "h23", // Menggunakan format 24 jam (00-23).
			// Opsi lain: 'h12' untuk format 12 jam AM/PM (jika 'hour12: true' juga diset)
			// Jika Anda ingin format 12 jam AM/PM, gunakan:
			// hour12: true,
		};

		// Menggunakan 'id-ID' untuk konvensi format Indonesia (misal urutan, pemisah)
		let formattedTime = date.toLocaleTimeString("id-ID", options);

		// Opsional: Tambahkan teks " WIB" setelah waktu
		// Jika Anda ingin menambahkan " WIB" secara eksplisit, hilangkan komentar pada baris di bawah:
		// formattedTime += " WIB";
		// Contoh hasil jika diaktifkan: "14:35 WIB"

		return formattedTime;
	}
} // <-- Tambahkan penutup fungsi displayMessages di sini

setInterval(loadMessages, 3000);
window.onload = loadMessages;
