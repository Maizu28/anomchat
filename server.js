const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");

const app = express();
const db = new sqlite3.Database("./chat.db");

app.use(cors());
app.use(bodyParser.json());

db.run(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender TEXT,
    text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

app.post("/message", (req, res) => {
  const { sender, text } = req.body;
  db.run("INSERT INTO messages (sender, text) VALUES (?, ?)", [sender, text], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, sender, text });
  });
});

app.get("/messages", (req, res) => {
  db.all("SELECT * FROM messages ORDER BY created_at ASC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
