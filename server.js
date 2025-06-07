require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const socketIO = require("socket.io");
const path = require("path");

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
    groupName: "Anon Group",
    groupPhoto: "https://i.ibb.co/7bQ6pMv/group-photo.jpg",
  });
});

io.on("connection", (socket) => {
  socket.on("sendMessage", async (data) => {
    const message = new Message(data);
    await message.save();
    io.emit("message", message);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server running on port", PORT));
