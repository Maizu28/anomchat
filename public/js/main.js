document.addEventListener('DOMContentLoaded', () => {
    const socket = io(); // Terhubung ke server Socket.IO

    // Elemen UI
    const groupNameEl = document.getElementById('groupName');
    const groupProfilePicEl = document.getElementById('groupProfilePic');
    const chatMessagesEl = document.getElementById('chatMessages');
    const messageInputEl = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const attachFileBtn = document.getElementById('attachFileBtn');
    const fileInput = document.getElementById('fileInput'); // Input file yang tersembunyi
    const emojiBtn = document.getElementById('emojiBtn');
    const voiceNoteBtn = document.getElementById('voiceNoteBtn');

    // Elemen untuk fitur Balas (Reply)
    const replyPreviewEl = document.getElementById('replyPreview');
    const replyPreviewSenderEl = document.getElementById('replyPreviewSender');
    const replyPreviewTextEl = document.getElementById('replyPreviewText');
    const cancelReplyBtn = document.getElementById('cancelReplyBtn');

    let currentReplyToMessageId = null; // Menyimpan ID pesan yang akan dibalas
    let mySenderId = null; // Akan diisi dengan socket.id klien ini

    let mediaRecorder; // Untuk merekam suara
    let audioChunks = [];
    let isRecording = false;

    // --- Informasi Grup ---
    socket.on('group info', (info) => {
        groupNameEl.textContent = info.name;
        if (info.profilePicture) {
            groupProfilePicEl.src = info.profilePicture;
        }
    });

    // Dapatkan ID klien sendiri setelah terhubung
    socket.on('connect', () => {
        mySenderId = socket.id;
        console.log("Terhubung ke server dengan ID:", mySenderId);
    });

    // --- Muat Pesan Lama ---
    socket.on('load old messages', (messages) => {
        chatMessagesEl.innerHTML = ''; // Bersihkan pesan lama sebelum memuat
        messages.forEach(msg => displayMessage(msg, false)); // Jangan scroll untuk pemuatan awal
        scrollToBottom(); // Scroll ke bawah setelah semua pesan lama dimuat
    });

    // --- Menangani Pesan Masuk ---
    socket.on('chat message', (msg) => {
        displayMessage(msg, true); // Scroll untuk pesan baru
    });

    socket.on('message error', (error) => {
        alert(`Error: ${error}`); // Tampilkan error sederhana
    });

    // --- Kirim Pesan ---
    function sendMessage() {
        const content = messageInputEl.value.trim();
        if (content) {
            const messageData = {
                type: 'text',
                content: content,
                replyTo: currentReplyToMessageId,
            };
            socket.emit('chat message', messageData);
            messageInputEl.value = ''; // Kosongkan input
            cancelReply(); // Hapus status balasan setelah mengirim
            messageInputEl.focus();
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    messageInputEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { // Kirim jika Enter ditekan (bukan Shift+Enter)
            e.preventDefault(); // Hindari baris baru di input
            sendMessage();
        }
    });

    // --- Fungsi untuk Menampilkan Pesan di UI ---
    function displayMessage(msg, shouldScroll = true) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.dataset.messageId = msg._id; // Simpan ID pesan dari MongoDB

        if (msg.senderId === mySenderId) {
            messageDiv.classList.add('sent');
        } else {
            messageDiv.classList.add('received');
            const senderIdEl = document.createElement('div');
            senderIdEl.classList.add('sender-id');
            // Buat ID pengirim anonim yang lebih pendek dan ramah
            senderIdEl.textContent = `User ${msg.senderId.substring(0, 6)}`;
            messageDiv.appendChild(senderIdEl);
        }

        // --- Menangani Pesan yang Dibalas ---
        if (msg.replyTo && msg.repliedMessageContent) {
            const replyBox = document.createElement('div');
            replyBox.classList.add('message-reply');
            replyBox.onclick = () => { // Tambahkan fungsionalitas klik untuk scroll ke pesan asli
                const originalMsgEl = chatMessagesEl.querySelector(`[data-message-id="${msg.replyTo._id || msg.replyTo}"]`);
                if (originalMsgEl) {
                    originalMsgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    originalMsgEl.style.backgroundColor = '#ffff99'; // Sorot sementara
                    setTimeout(() => { originalMsgEl.style.backgroundColor = ''; }, 2000);
                }
            };

            const replySender = document.createElement('div');
            replySender.classList.add('reply-sender');
            replySender.textContent = msg.repliedMessageSender || (msg.replyTo.senderId ? `User ${msg.replyTo.senderId.substring(0, 6)}` : 'Pengguna Asli');

            const replyContentPreview = document.createElement('div');
            replyContentPreview.classList.add('reply-content');

            let previewText = msg.repliedMessageContent;
            if (msg.replyTo && typeof msg.replyTo === 'object') { // Jika replyTo sudah di-populate
                switch (msg.replyTo.type) {
                    case 'image': previewText = "🖼️ Gambar"; break;
                    case 'sticker': previewText = "🏷️ Stiker"; break;
                    case 'video': previewText = "🎬 Video"; break;
                    case 'audio': previewText = "🎵 Audio"; break;
                    case 'voice': previewText = "🎤 Pesan Suara"; break;
                    case 'file': previewText = `📄 File: ${msg.replyTo.fileName || 'File'}`; break;
                    default: previewText = msg.repliedMessageContent.substring(0, 70) + (msg.repliedMessageContent.length > 70 ? '...' : '');
                }
            } else { // Jika replyTo hanya ID, gunakan repliedMessageContent
                 previewText = msg.repliedMessageContent.substring(0, 70) + (msg.repliedMessageContent.length > 70 ? '...' : '');
            }
            replyContentPreview.textContent = previewText;

            replyBox.appendChild(replySender);
            replyBox.appendChild(replyContentPreview);
            messageDiv.appendChild(replyBox);
        }

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');

        switch (msg.type) {
            case 'text':
                contentDiv.textContent = msg.content;
                break;
            case 'image':
                const img = document.createElement('img');
                img.src = msg.content; // URL gambar
                img.alt = msg.fileName || 'Gambar';
                img.onload = () => scrollToBottomIfNeeded(shouldScroll); // Scroll setelah gambar dimuat
                contentDiv.appendChild(img);
                break;
            case 'video':
                const video = document.createElement('video');
                video.src = msg.content; // URL video
                video.controls = true;
                video.onloadedmetadata = () => scrollToBottomIfNeeded(shouldScroll);
                contentDiv.appendChild(video);
                break;
            case 'audio':
            case 'voice': // Pesan suara ditampilkan seperti audio
                const audio = document.createElement('audio');
                audio.src = msg.content; // URL audio/pesan suara
                audio.controls = true;
                audio.onloadedmetadata = () => scrollToBottomIfNeeded(shouldScroll);
                contentDiv.appendChild(audio);
                break;
            case 'sticker':
                const stickerImg = document.createElement('img');
                stickerImg.src = msg.content; // URL stiker
                stickerImg.alt = 'Stiker';
                stickerImg.classList.add('sticker-message');
                stickerImg.onload = () => scrollToBottomIfNeeded(shouldScroll);
                contentDiv.appendChild(stickerImg);
                break;
            case 'file': // Menampilkan link ke file umum
                const fileLink = document.createElement('a');
                fileLink.href = msg.content;
                fileLink.textContent = `Unduh File: ${msg.fileName || 'File Lampiran'}`;
                fileLink.target = "_blank"; // Buka di tab baru
                contentDiv.appendChild(fileLink);
                break;
            default:
                contentDiv.textContent = `Tipe pesan tidak didukung: ${msg.content}`;
        }
        messageDiv.appendChild(contentDiv);

        const metaDiv = document.createElement('div');
        metaDiv.classList.add('message-meta');
        const timeEl = document.createElement('span');
        timeEl.textContent = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        metaDiv.appendChild(timeEl);

        // Tambahkan tombol reply ke setiap pesan
        const replyButton = document.createElement('button');
        replyButton.innerHTML = '&#x21A9;'; // Simbol reply (↩️) atau ikon lain
        replyButton.classList.add('reply-btn-in-message');
        replyButton.title = "Balas Pesan Ini";
        replyButton.onclick = (e) => {
            e.stopPropagation(); // Hindari trigger event lain jika ada
            startReply(msg);
        };
        metaDiv.appendChild(replyButton);
        messageDiv.appendChild(metaDiv);

        chatMessagesEl.appendChild(messageDiv);
        scrollToBottomIfNeeded(shouldScroll);
    }

    function scrollToBottomIfNeeded(shouldScroll) {
        if (shouldScroll) {
            // Cek apakah pengguna sedang scroll ke atas untuk melihat pesan lama
            // Toleransi: jika scrollbar tidak terlalu jauh dari bawah, scroll otomatis
            const isScrolledToBottom = chatMessagesEl.scrollHeight - chatMessagesEl.clientHeight <= chatMessagesEl.scrollTop + 100; // Toleransi 100px
            if (isScrolledToBottom) {
                scrollToBottom();
            }
        }
    }

    // --- Fungsi untuk Memulai Balasan ---
    function startReply(msg) {
        currentReplyToMessageId = msg._id;
        replyPreviewSenderEl.textContent = `User ${msg.senderId.substring(0, 6)}`;

        let previewText = msg.content;
        switch (msg.type) {
            case 'image': previewText = "🖼️ Gambar"; break;
            case 'sticker': previewText = "🏷️ Stiker"; break;
            case 'video': previewText = "🎬 Video"; break;
            case 'audio': previewText = "🎵 Audio"; break;
            case 'voice': previewText = "🎤 Pesan Suara"; break;
            case 'file': previewText = `📄 File: ${msg.fileName || 'File'}`; break;
        }
        replyPreviewTextEl.textContent = previewText.substring(0, 50) + (previewText.length > 50 ? '...' : '');
        replyPreviewEl.style.display = 'flex';
        messageInputEl.focus();
    }

    // --- Batalkan Balasan ---
    cancelReplyBtn.addEventListener('click', cancelReply);
    function cancelReply() {
        currentReplyToMessageId = null;
        replyPreviewEl.style.display = 'none';
        replyPreviewSenderEl.textContent = '';
        replyPreviewTextEl.textContent = '';
    }

    function scrollToBottom() {
        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    }

    // --- Penanganan Unggahan File ---
    attachFileBtn.addEventListener('click', () => {
        fileInput.click(); // Picu input file yang tersembunyi
    });

    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        // Tampilkan indikator loading sederhana
        const tempMsgId = `temp-${Date.now()}`;
        displayMessage({ _id: tempMsgId, type:'text', content: `Mengunggah ${file.name}...`, senderId: mySenderId, timestamp: new Date()}, true);


        try {
            // Unggah ke server, server akan mengembalikan URL/path
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            // Hapus pesan loading sementara
            const tempMsgElement = chatMessagesEl.querySelector(`[data-message-id="${tempMsgId}"]`);
            if (tempMsgElement) tempMsgElement.remove();

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(`Unggahan gagal: ${errorData.message || response.statusText}`);
            }

            const result = await response.json();
            const filePath = result.filePath; // URL/path yang dikembalikan server

            let messageType = 'file'; // Default
            if (file.type.startsWith('image/')) messageType = 'image';
            else if (file.type.startsWith('video/')) messageType = 'video';
            else if (file.type.startsWith('audio/')) messageType = 'audio';
            // Untuk stiker, Anda mungkin punya UI terpisah atau memperlakukannya sebagai gambar.
            // Jika itu GIF dan Anda menganggapnya stiker:
            // if (file.type === 'image/gif' && isStickerContext) messageType = 'sticker';

            socket.emit('chat message', {
                type: messageType,
                content: filePath,    // Ini adalah URL/path ke file
                fileName: file.name,
                replyTo: currentReplyToMessageId
            });
            cancelReply(); // Hapus status balasan jika ada

        } catch (error) {
            console.error('Error mengunggah file:', error);
            alert(`Unggahan file gagal: ${error.message}`);
            const tempMsgElement = chatMessagesEl.querySelector(`[data-message-id="${tempMsgId}"]`);
            if (tempMsgElement) tempMsgElement.textContent = `Gagal mengunggah ${file.name}.`;
        } finally {
            fileInput.value = ''; // Reset input file agar bisa memilih file yang sama lagi
        }
    });

    // --- Pesan Suara (Voice Notes) ---
    voiceNoteBtn.addEventListener('click', toggleVoiceRecording);

    async function toggleVoiceRecording() {
        if (!isRecording) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' }); // Coba tentukan mimeType
                audioChunks = [];

                mediaRecorder.ondataavailable = event => {
                    audioChunks.push(event.data);
                };

                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
                    const audioFile = new File([audioBlob], `pesan-suara-${Date.now()}.webm`, { type: mediaRecorder.mimeType || 'audio/webm' });

                    // Unggah pesan suara (mirip unggah file)
                    const formData = new FormData();
                    formData.append('file', audioFile);

                     // Tampilkan indikator loading sederhana
                    const tempMsgId = `temp-vn-${Date.now()}`;
                    displayMessage({ _id: tempMsgId, type:'text', content: `Mengirim pesan suara...`, senderId: mySenderId, timestamp: new Date()}, true);

                    try {
                        const response = await fetch('/upload', { // Gunakan endpoint /upload yang sama
                            method: 'POST',
                            body: formData
                        });
                         // Hapus pesan loading sementara
                        const tempMsgElement = chatMessagesEl.querySelector(`[data-message-id="${tempMsgId}"]`);
                        if (tempMsgElement) tempMsgElement.remove();

                        if (!response.ok) throw new Error('Unggahan pesan suara gagal');
                        const result = await response.json();

                        socket.emit('chat message', {
                            type: 'voice',
                            content: result.filePath, // URL pesan suara
                            fileName: audioFile.name,
                            replyTo: currentReplyToMessageId
                        });
                        cancelReply();
                    } catch (err) {
                        console.error("Error mengirim pesan suara:", err);
                        alert("Tidak dapat mengirim pesan suara.");
                         const tempMsgElement = chatMessagesEl.querySelector(`[data-message-id="${tempMsgId}"]`);
                        if (tempMsgElement) tempMsgElement.textContent = `Gagal mengirim pesan suara.`;
                    }

                    stream.getTracks().forEach(track => track.stop()); // Hentikan track mikrofon
                };

                mediaRecorder.start();
                isRecording = true;
                voiceNoteBtn.textContent = '🛑'; // Ikon berhenti
                voiceNoteBtn.classList.add('recording');
            } catch (err) {
                console.error('Error mengakses mikrofon:', err);
                alert('Tidak dapat mengakses mikrofon. Mohon izinkan akses mikrofon di browser Anda.');
            }
        } else {
            mediaRecorder.stop();
            isRecording = false;
            voiceNoteBtn.textContent = '🎤'; // Ikon rekam
            voiceNoteBtn.classList.remove('recording');
        }
    }

    // --- Emoji (Placeholder Dasar - butuh library emoji picker) ---
    emojiBtn.addEventListener('click', () => {
        // Di sinilah Anda akan mengintegrasikan emoji picker.
        // Untuk saat ini, kita hanya menyisipkan emoji contoh.
        messageInputEl.value += '😀';
        messageInputEl.focus();
        // Contoh: jika menggunakan library seperti 'emoji-mart'
        // const pickerOptions = { onEmojiSelect: emoji => messageInputEl.value += emoji.native }
        // const picker = new EmojiMart.Picker(pickerOptions)
        // document.body.appendChild(picker) // Tampilkan picker, atur posisi dengan CSS
    });


    // --- Stiker (Konseptual) ---
    // Anda memerlukan panel stiker. Mengeklik stiker akan mengirim pesan tipe 'sticker'.
    // Contoh: jika Anda punya gambar stiker di /stickers/keren.png
    // function sendSticker(stickerUrl) {
    //     socket.emit('chat message', {
    //         type: 'sticker',
    //         content: stickerUrl, // URL atau path ke stiker
    //         replyTo: currentReplyToMessageId
    //     });
    //     cancelReply();
    // }
    // // Misal ada tombol stiker:
    // // document.getElementById('tombolStikerKeren').onclick = () => sendSticker('/stickers/keren.png');

});