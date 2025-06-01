// Dalam fungsi initializeDb()
await pool.query(`
  CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255),
    message TEXT,
    reply_to INTEGER REFERENCES messages(id),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);