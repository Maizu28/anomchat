const socket = io();

// Buat anonId jika belum ada
if (!localStorage.getItem("anonId")) {
  localStorage.setItem("anonId", crypto.randomUUID());
}
const anonId = localStorage.getItem("anonId");

const form = document.getElementById("form");
const input = document.getElementById("input");
const chat = document.getElementById("chat");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  const replyTo = input.dataset.replyTo || null;
  socket.emit("sendMessage", {
    text,
    time: new Date().toLocaleTimeString(),
    replyTo,
    anonId
  });

  input.value = "";
  input.dataset.replyTo = "";
});

socket.on("message", (data) => {
  const li = document.createElement("li");
  li.className = data.anonId === anonId ? "me" : "other";

  if (data.replyTo) {
    const replyDiv = document.createElement("div");
    replyDiv.className = "reply-to";
    replyDiv.textContent = data.replyTo;
    li.appendChild(replyDiv);
  }

  const span = document.createElement("span");
  span.textContent = data.text;
  li.appendChild(span);

  const small = document.createElement("small");
  small.textContent = data.time;
  li.appendChild(small);

  const button = document.createElement("button");
  button.className = "reply-btn";
  button.textContent = "↩";
  button.dataset.text = data.text;
  button.addEventListener("click", () => {
    input.dataset.replyTo = data.text;
    input.focus();
  });
  li.appendChild(button);

  chat.appendChild(li);
  chat.scrollTop = chat.scrollHeight;
});
