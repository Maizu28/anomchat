require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const socketIO = require("socket.io");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const Message = mongoose.model("Message", {
  text: String,
  time: String,
  replyTo: String,
});

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", async (req, res) => {
  const messages = await Message.find({});
  res.render("index", {
    messages,
    groupName: "Group Anomali",
    groupPhoto: "https://github.com/Maizu28/anomchat/blob/main/image.png?raw=true",
    groupDescription: "Tempat ngobrol bebas tanpa identitas.",
  });
});

// Load ban word list once
const bannedWords = JSON.parse(fs.readFileSync("./bannedWords.json", "utf-8"));

function filterBadWords(text) {
  let filtered = text;
  bannedWords.forEach(word => {
    const pattern = new RegExp(`\\b${word}+\\w*\\b`, "gi");
    filtered = filtered.replace(pattern, "***");
  });
  return filtered;
}

io.on("connection", (socket) => {
  socket.on("sendMessage", async (data) => {
    data.text = filterBadWords(data.text);
    const message = new Message(data);
    await message.save();

    socket.emit("message", { ...data, sender: "me", _id: message._id });
    socket.broadcast.emit("message", { ...data, sender: "other", _id: message._id });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server running on port", PORT));
