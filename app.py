from flask import Flask, render_template, session, request
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO, emit
from datetime import datetime
import random, string, os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'  # ganti untuk produksi
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///chat.db')
db = SQLAlchemy(app)
socketio = SocketIO(app)

# Model Pesan
class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(16), nullable=False)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

# Buat tabel jika belum ada
@app.before_first_request
def create_tables():
    db.create_all()

# Generate nama anonim per sesi
def get_username():
    if 'username' not in session:
        session['username'] = 'Anon-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return session['username']

# Halaman utama
@app.route('/')
def index():
    username = get_username()
    return render_template('index.html', username=username)

# WebSocket handler
@socketio.on('send_message')
def handle_send(data):
    username = get_username()
    content = data.get('content')
    if content:
        msg = Message(username=username, content=content)
        db.session.add(msg)
        db.session.commit()
        emit('receive_message', {
            'username': username,
            'content': content,
            'timestamp': msg.timestamp.strftime('%H:%M:%S')
        }, broadcast=True)

if __name__ == '__main__':
    socketio.run(app, debug=True)
