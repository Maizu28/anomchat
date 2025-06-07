const socket = io();
const form = document.getElementById("form");
const input = document.getElementById("input");
const chat = document.getElementById("chat");

let replyTo = "";

form.addEventListener("submit", function (e) {
  e.preventDefault();
  if (input.value.trim()) {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const message = {
      text: input.value,
      time,
      replyTo
    };
    socket.emit("sendMessage", message);
    input.value = "";
    replyTo = "";
  }
});

socket.on("message", function (msg) {
  const li = document.createElement("li");
  li.className = msg.sender;
  if (msg.replyTo) {
    const replyDiv = document.createElement("div");
    replyDiv.className = "reply-to";
    replyDiv.textContent = msg.replyTo;
    li.appendChild(replyDiv);
  }
  const span = document.createElement("span");
  span.textContent = msg.text;
  const time = document.createElement("small");
  time.textContent = msg.time;

  const replyBtn = document.createElement("button");
  replyBtn.className = "reply-btn";
  replyBtn.textContent = "↩";
  replyBtn.dataset.text = msg.text;

  if (msg.sender === "me") {
    replyBtn.style.left = "5px";
  } else {
    replyBtn.style.right = "5px";
  }

  li.appendChild(span);
  li.appendChild(time);
  li.appendChild(replyBtn);
  chat.appendChild(li);
  chat.scrollTop = chat.scrollHeight;
});

chat.addEventListener("click", function (e) {
  if (e.target.classList.contains("reply-btn")) {
    replyTo = e.target.dataset.text;
    input.focus();
  }
});

input.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    form.dispatchEvent(new Event("submit"));
  }
});
