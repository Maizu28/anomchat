from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

# Railway PostgreSQL or fallback to SQLite
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///chat.db')
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

class Chat(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), default='Anonim')
    message = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/send', methods=['POST'])
def send():
    data = request.json
    message = data.get('message', '').strip()
    if not message:
        return jsonify({'status': 'error', 'message': 'Message is empty'}), 400

    new_msg = Chat(username=data.get('username', 'Anonim'), message=message)
    db.session.add(new_msg)
    db.session.commit()
    return jsonify({'status': 'success'})


@app.route('/messages', methods=['GET'])
def get_messages():
    messages = Chat.query.order_by(Chat.timestamp.asc()).all()
    return jsonify([
        {
            'username': msg.username,
            'message': msg.message,
            'timestamp': msg.timestamp.strftime('%H:%M')
        } for msg in messages
    ])

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
