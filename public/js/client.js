const socket = io();

const messages = document.getElementById('messages');
const form = document.getElementById('form'); // Note: 'form' is not in HTML, need to add it or use button
const input = document.getElementById('m');
const sendButton = document.getElementById('send');
const replyPreview = document.getElementById('reply-preview');
const replyUsernameSpan = document.getElementById('reply-username');
const replyMessageTextSpan = document.getElementById('reply-message-text');
const clearReplyButton = document.getElementById('clear-reply');

let replyToMessage = null; // To store message being replied to

// Function to generate a random anonymous username
function generateAnonymousUsername() {
    const adjectives = ['Happy', 'Sad', 'Brave', 'Kind', 'Wise', 'Clever', 'Energetic'];
    const nouns = ['User', 'Explorer', 'Seeker', 'Dreamer', 'Pioneer', 'Observer'];
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${randomAdjective} ${randomNoun}`;
}

let username = localStorage.getItem('anonymousUsername');
if (!username) {
    username = generateAnonymousUsername();
    localStorage.setItem('anonymousUsername', username);
}

// Function to append a message to the chat
function appendMessage(data, isLocal) {
    const item = document.createElement('div');
    item.classList.add('message-bubble');

    // Determine if it's a self (local storage) or other (non-local storage) message
    if (isLocal) {
        item.classList.add('local-storage');
    } else {
        item.classList.add('non-local-storage');
    }

    let messageContent = '';
    if (data.replyTo && data.replyTo.message) {
        messageContent += `
            <div class="reply-container">
                <p>Replying to: <span class="reply-username">${data.replyTo.username}</span></p>
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

    // Add reply button
    const replyButton = document.createElement('button');
    replyButton.classList.add('reply-button');
    replyButton.textContent = 'Reply';
    replyButton.onclick = () => {
        replyToMessage = {
            username: data.username,
            message: data.message,
            isLocal: data.isLocal
        };
        replyUsernameSpan.textContent = data.username;
        replyMessageTextSpan.textContent = data.message;
        replyPreview.style.display = 'flex';
        input.focus();
    };
    item.appendChild(replyButton);

    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight; // Scroll to bottom
}

// Load old messages from the server
socket.on('load old messages', (msgs) => {
    msgs.forEach(msg => {
        // Determine if it's a message from the current user based on username
        const isCurrentLocalUser = msg.username === username;
        appendMessage(msg, isCurrentLocalUser);
    });
});

// Handle incoming chat messages
socket.on('chat message', (msg) => {
    // Determine if the incoming message is from the current user (based on the generated username)
    const isCurrentLocalUser = msg.username === username;
    appendMessage(msg, isCurrentLocalUser);
});

// Send message function
function sendMessage() {
    if (input.value) {
        const messageData = {
            username: username,
            message: input.value,
            isLocal: true, // Mark messages sent from this client as local
            replyTo: replyToMessage // Will be null if not a reply
        };
        socket.emit('chat message', messageData);
        input.value = '';
        replyToMessage = null; // Clear reply state
        replyPreview.style.display = 'none';
    }
}

// Send message on button click
sendButton.addEventListener('click', sendMessage);

// Send message on Enter key press
input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Clear reply
clearReplyButton.addEventListener('click', () => {
    replyToMessage = null;
    replyPreview.style.display = 'none';
});