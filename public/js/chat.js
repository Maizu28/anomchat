const socket = io();
const form = document.getElementById("form");
const input = document.getElementById("input");
const chat = document.getElementById("chat");

let replyTo = "";

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (text === "") return;

  const msg = {
    text,
    replyTo,
    time: new Date().toLocaleTimeString(),
  };

  socket.emit("sendMessage", msg);
  input.value = "";
  replyTo = "";
});

socket.on("message", (msg) => {
  const li = document.createElement("li");

  if (msg.replyTo) {
    const replyDiv = document.createElement("div");
    replyDiv.className = "reply-to";
    replyDiv.textContent = msg.replyTo;
    li.appendChild(replyDiv);
  }

  li.innerHTML += `<span>${msg.text}</span><small>${msg.time}</small><button class="reply-btn" data-text="${msg.text}">↩</button>`;
  chat.appendChild(li);
  chat.scrollTop = chat.scrollHeight;
});

chat.addEventListener("click", (e) => {
  if (e.target.classList.contains("reply-btn")) {
    replyTo = e.target.getAttribute("data-text");
    input.focus();
  }
});

input.addEventListener("keydown", (e) => {
  const isMobile = window.innerWidth <= 600;

  if (e.key === "Enter") {
    if ((isMobile && !e.shiftKey) || (!isMobile && e.shiftKey)) {
      // Add newline
      e.preventDefault();
      const start = input.selectionStart;
      input.value = input.value.slice(0, start) + "\n" + input.value.slice(start);
      input.selectionStart = input.selectionEnd = start + 1;
    } else {
      // Send message
      form.requestSubmit();
    }
  }
});
