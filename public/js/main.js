document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    const groupNameEl = document.getElementById('groupName');
    const groupProfilePicEl = document.getElementById('groupProfilePic');
    const chatMessagesEl = document.getElementById('chatMessages');
    const messageInputEl = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const attachFileBtn = document.getElementById('attachFileBtn');
    const fileInput = document.getElementById('fileInput');
    const emojiBtn = document.getElementById('emojiBtn'); // For future emoji picker
    const voiceNoteBtn = document.getElementById('voiceNoteBtn');

    // Reply elements
    const replyPreviewEl = document.getElementById('replyPreview');
    const replyPreviewSenderEl = document.getElementById('replyPreviewSender');
    const replyPreviewTextEl = document.getElementById('replyPreviewText');
    const cancelReplyBtn = document.getElementById('cancelReplyBtn');

    let currentReplyToMessageId = null;
    let mySenderId = null; // Will be set by the server or identified by socket.id on client
    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;

    // --- Group Info ---
    socket.on('group info', (info) => {
        groupNameEl.textContent = info.name;
        if (info.profilePicture) {
            groupProfilePicEl.src = info.profilePicture;
        }
    });

    // Get client's own ID after connection (not strictly necessary for anonymous, but good for 'sent' vs 'received' styling if server doesn't provide it with each message)
    socket.on('connect', () => {
        mySenderId = socket.id;
        console.log("Connected to server with ID:", mySenderId);
    });

    // --- Load Old Messages ---
    socket.on('load old messages', (messages) => {
        messages.forEach(msg => displayMessage(msg, false)); // Don't scroll for initial load
        scrollToBottom();
    });

    // --- Handle Incoming Messages ---
    socket.on('chat message', (msg) => {
        displayMessage(msg, true); // Scroll for new messages
    });

    socket.on('message error', (error) => {
        alert(`Error: ${error}`); // Simple error display
    });

    // --- Send Message ---
    function sendMessage() {
        const content = messageInputEl.value.trim();
        if (content) {
            socket.emit('chat message', {
                type: 'text',
                content: content,
                replyTo: currentReplyToMessageId,
                // For replies, you might want to send a snippet of the replied message too for the server to store
            });
            messageInputEl.value = '';
            cancelReply(); // Clear reply state after sending
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    messageInputEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // --- Display Message Function ---
    function displayMessage(msg, shouldScroll = true) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.dataset.messageId = msg._id; // Store MongoDB message ID

        // Determine if the message was sent by the current user
        // The server should ideally send a flag like `isOwnMessage` or we compare senderId
        if (msg.senderId === mySenderId) {
            messageDiv.classList.add('sent');
        } else {
            messageDiv.classList.add('received');
            const senderIdEl = document.createElement('div');
            senderIdEl.classList.add('sender-id');
            senderIdEl.textContent = `User ${msg.senderId.substring(0, 6)}`; // Display a short, anonymized ID
            messageDiv.appendChild(senderIdEl);
        }

        // --- Handle Replied Message ---
        if (msg.replyTo && msg.repliedMessageContent) {
            const replyBox = document.createElement('div');
            replyBox.classList.add('message-reply');

            const replySender = document.createElement('div');
            replySender.classList.add('reply-sender');
            replySender.textContent = msg.repliedMessageSender || `User ${msg.replyTo.senderId ? msg.replyTo.senderId.substring(0,6) : 'Unknown'}`; // Adjust based on data

            const replyContentPreview = document.createElement('div');
            replyContentPreview.classList.add('reply-content');
            // If replied message was an image/video, show "Image" or "Video"
            if (msg.replyTo && (msg.replyTo.type === 'image' || msg.replyTo.type === 'sticker')) {
                 replyContentPreview.textContent = "🖼️ Sticker/Image";
            } else if (msg.replyTo && msg.replyTo.type === 'video') {
                replyContentPreview.textContent = "🎬 Video";
            } else if (msg.replyTo && (msg.replyTo.type === 'audio' || msg.replyTo.type === 'voice')) {
                replyContentPreview.textContent = "🎵 Audio";
            } else {
                 replyContentPreview.textContent = msg.repliedMessageContent.substring(0, 100) + (msg.repliedMessageContent.length > 100 ? '...' : '');
            }


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
                img.src = msg.content; // URL of the image
                img.alt = msg.fileName || 'Image';
                contentDiv.appendChild(img);
                break;
            case 'video':
                const video = document.createElement('video');
                video.src = msg.content;
                video.controls = true;
                contentDiv.appendChild(video);
                break;
            case 'audio':
            case 'voice': // Treat voice notes like other audio files for display
                const audio = document.createElement('audio');
                audio.src = msg.content;
                audio.controls = true;
                contentDiv.appendChild(audio);
                break;
            case 'sticker':
                const stickerImg = document.createElement('img');
                stickerImg.src = msg.content; // URL of the sticker
                stickerImg.alt = 'Sticker';
                stickerImg.classList.add('sticker-message');
                contentDiv.appendChild(stickerImg);
                break;
            default:
                contentDiv.textContent = `Unsupported message type: ${msg.content}`;
        }
        messageDiv.appendChild(contentDiv);

        const metaDiv = document.createElement('div');
        metaDiv.classList.add('message-meta');
        metaDiv.textContent = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        messageDiv.appendChild(metaDiv);

        // Add reply button to each message
        const replyButton = document.createElement('button');
        replyButton.textContent = '↩️'; // Reply icon
        replyButton.classList.add('reply-btn'); // Add CSS for this
        replyButton.style.fontSize = "0.7em";
        replyButton.style.marginLeft = "5px";
        replyButton.style.cursor = "pointer";
        replyButton.style.border = "none";
        replyButton.style.background = "transparent";


        replyButton.onclick = () => {
            currentReplyToMessageId = msg._id;
            replyPreviewSenderEl.textContent = `Replying to User ${msg.senderId.substring(0, 6)}`;

            let previewText = msg.content;
            if (msg.type === 'image' || msg.type === 'sticker') previewText = "🖼️ Sticker/Image";
            else if (msg.type === 'video') previewText = "🎬 Video";
            else if (msg.type === 'audio' || msg.type === 'voice') previewText = "🎵 Audio";

            replyPreviewTextEl.textContent = previewText.substring(0, 50) + (previewText.length > 50 ? '...' : '');
            replyPreviewEl.style.display = 'flex';
            messageInputEl.focus();
        };
        metaDiv.appendChild(replyButton); // Append to meta or directly to messageDiv

        chatMessagesEl.appendChild(messageDiv);
        if (shouldScroll) {
            scrollToBottom();
        }
    }

    cancelReplyBtn.addEventListener('click', cancelReply);

    function cancelReply() {
        currentReplyToMessageId = null;
        replyPreviewEl.style.display = 'none';
    }

    function scrollToBottom() {
        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    }

    // --- File Handling ---
    attachFileBtn.addEventListener('click', () => {
        fileInput.click(); // Trigger hidden file input
    });

    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Upload to server, server returns a URL
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }

            const result = await response.json();
            const filePath = result.filePath; // URL/path returned by server

            let messageType = 'file'; // Default
            if (file.type.startsWith('image/')) messageType = 'image';
            else if (file.type.startsWith('video/')) messageType = 'video';
            else if (file.type.startsWith('audio/')) messageType = 'audio';
            // For stickers, you might have a separate UI or treat them as images.
            // If it's a GIF and you consider it a sticker:
            // if (file.type === 'image/gif' && isStickerContext) messageType = 'sticker';


            socket.emit('chat message', {
                type: messageType,
                content: filePath, // This is the URL/path to the file
                fileName: file.name,
                replyTo: currentReplyToMessageId
            });
            cancelReply();

        } catch (error) {
            console.error('Error uploading file:', error);
            alert('File upload failed.');
        } finally {
            fileInput.value = ''; // Reset file input
        }
    });

    // --- Voice Notes ---
    voiceNoteBtn.addEventListener('click', toggleVoiceRecording);

    async function toggleVoiceRecording() {
        if (!isRecording) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = event => {
                    audioChunks.push(event.data);
                };

                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' }); // Or 'audio/mp3' if you transcode
                    const audioFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });

                    // Upload the voice note (similar to file upload)
                    const formData = new FormData();
                    formData.append('file', audioFile);

                    try {
                        const response = await fetch('/upload', { // Use the same /upload endpoint
                            method: 'POST',
                            body: formData
                        });
                        if (!response.ok) throw new Error('Voice note upload failed');
                        const result = await response.json();

                        socket.emit('chat message', {
                            type: 'voice',
                            content: result.filePath, // URL of the voice note
                            fileName: audioFile.name,
                            replyTo: currentReplyToMessageId
                        });
                        cancelReply();
                    } catch (err) {
                        console.error("Error sending voice note:", err);
                        alert("Could not send voice note.");
                    }

                    // Clean up stream tracks
                    stream.getTracks().forEach(track => track.stop());
                };

                mediaRecorder.start();
                isRecording = true;
                voiceNoteBtn.textContent = '🛑'; // Stop icon
                voiceNoteBtn.style.color = 'red';
            } catch (err) {
                console.error('Error accessing microphone:', err);
                alert('Could not access microphone. Please allow permission.');
            }
        } else {
            mediaRecorder.stop();
            isRecording = false;
            voiceNoteBtn.textContent = '🎤'; // Record icon
            voiceNoteBtn.style.color = '#075e54';
        }
    }

    // --- Emoji (Basic Placeholder - needs an emoji picker library) ---
    emojiBtn.addEventListener('click', () => {
        // This is where you would integrate an emoji picker.
        // For now, let's just insert a sample emoji.
        messageInputEl.value += '😀';
        messageInputEl.focus();
        // Example: if using a library like 'emoji-mart'
        // new EmojiMart.Picker({ onEmojiSelect: emoji => messageInputEl.value += emoji.native }).show();
    });


    // --- Stickers (Conceptual) ---
    // You'd need a sticker panel. Clicking a sticker would send a message of type 'sticker'.
    // Example: if you have a sticker image at /stickers/cool.png
    // function sendSticker(stickerUrl) {
    //     socket.emit('chat message', {
    //         type: 'sticker',
    //         content: stickerUrl,
    //         replyTo: currentReplyToMessageId
    //     });
    //     cancelReply();
    // }
    // document.getElementById('someStickerButton').onclick = () => sendSticker('/stickers/cool.png');

});