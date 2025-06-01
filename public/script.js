document.addEventListener('DOMContentLoaded', () => {
  const socket = io();
  const usernameModal = document.getElementById('username-modal');
  const usernameInput = document.getElementById('username-input');
  const startChatBtn = document.getElementById('start-chat');
  const messageInput = document.getElementById('message-input');
  const sendButton = document.getElementById('send-button');
  const chatMessages = document.getElementById('chat-messages');
  const replyModal = document.getElementById('reply-modal');
  const replyPreview = document.getElementById('reply-preview');
  const replyMessageInput = document.getElementById('reply-message-input');
  const cancelReplyBtn = document.getElementById('cancel-reply');
  const sendReplyBtn = document.getElementById('send-reply');
  
  let username = 'Anonymous User';
  let replyingTo = null;
  
  // Show username modal
  usernameModal.style.display = 'flex';
  
  // Start chat button click
  startChatBtn.addEventListener('click', () => {
    if (usernameInput.value.trim() !== '') {
      username = usernameInput.value.trim();
      usernameModal.style.display = 'none';
      socket.emit('join', username);
    }
  });
  
  // Also allow Enter key in username input
  usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      startChatBtn.click();
    }
  });
  
  // Send message button click
  sendButton.addEventListener('click', sendMessage);
  
  // Also allow Enter key in message input
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
  
  // Cancel reply button
  cancelReplyBtn.addEventListener('click', () => {
    replyModal.style.display = 'none';
    replyingTo = null;
  });
  
  // Send reply button
  sendReplyBtn.addEventListener('click', sendReply);
  
  // Also allow Enter key in reply input
  replyMessageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendReply();
    }
  });
  
  function sendMessage() {
    const message = messageInput.value.trim();
    if (message !== '') {
      socket.emit('sendMessage', {
        username: username,
        message: message,
        replyTo: replyingTo?.id || null
      });
      messageInput.value = '';
      replyingTo = null;
    }
  }
  
  function sendReply() {
    const message = replyMessageInput.value.trim();
    if (message !== '') {
      socket.emit('sendMessage', {
        username: username,
        message: message,
        replyTo: replyingTo?.id || null
      });
      replyMessageInput.value = '';
      replyModal.style.display = 'none';
      replyingTo = null;
    }
  }
  
  // Receive new message
  socket.on('newMessage', (data) => {
    addMessage(data, true);
  });
  
  // Receive previous messages
  socket.on('previousMessages', (messages) => {
    messages.forEach(msg => {
      addMessage(msg, false);
    });
  });
  
  function addMessage(data, isNew) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    
    // Determine if message is sent by current user or received
    if (data.username === username) {
      messageElement.classList.add('sent');
    } else {
      messageElement.classList.add('received');
    }
    
    // Add click event for reply
    messageElement.addEventListener('click', () => {
      if (data.username !== username) { // Can't reply to own messages
        replyingTo = {
          id: data.id,
          username: data.username,
          message: data.message
        };
        showReplyModal(data.username, data.message);
      }
    });
    
    const usernameElement = document.createElement('div');
    usernameElement.classList.add('message-username');
    usernameElement.textContent = data.username;
    
    // Add reply preview if exists
    if (data.reply_username) {
      const replyIndicator = document.createElement('div');
      replyIndicator.classList.add('reply-indicator');
      replyIndicator.innerHTML = `<i class="fas fa-reply"></i> Replying to ${data.reply_username}`;
      
      const replyPreview = document.createElement('div');
      replyPreview.classList.add('message-reply');
      
      const replyUsername = document.createElement('div');
      replyUsername.classList.add('message-reply-username');
      replyUsername.textContent = data.reply_username;
      
      const replyContent = document.createElement('div');
      replyContent.classList.add('message-reply-content');
      replyContent.textContent = data.reply_message;
      
      replyPreview.appendChild(replyUsername);
      replyPreview.appendChild(replyContent);
      
      messageElement.appendChild(replyIndicator);
      messageElement.appendChild(replyPreview);
    }
    
    const contentElement = document.createElement('div');
    contentElement.classList.add('message-content');
    contentElement.textContent = data.message;
    
    const timeElement = document.createElement('div');
    timeElement.classList.add('message-time');
    timeElement.textContent = formatTime(new Date(data.timestamp));
    
    messageElement.appendChild(usernameElement);
    messageElement.appendChild(contentElement);
    messageElement.appendChild(timeElement);
    
    chatMessages.appendChild(messageElement);
    
    if (isNew) {
      // Scroll to bottom for new messages
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }
  
  function showReplyModal(username, message) {
    replyPreview.innerHTML = `
      <div class="message-reply">
        <div class="message-reply-username">${username}</div>
        <div class="message-reply-content">${message}</div>
      </div>
    `;
    replyMessageInput.value = '';
    replyModal.style.display = 'flex';
    replyMessageInput.focus();
  }
  
  function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
});