from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///chat.db')
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

class Chat(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False)
    message = db.Column(db.String(500), nullable=False)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

with app.app_context():
    if not os.path.exists(os.path.join(app.instance_path, 'chat.db')):
        db.create_all()
        print("Created database!")
    else:
        print("Database already exists.")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/send', methods=['POST'])
def send():
    try:
        data = request.get_json()
        if not data or 'message' not in data:
            return jsonify({'status': 'error', 'message': 'Message not provided'}), 400
        message = data['message'].strip()
        if not message:
            return jsonify({'status': 'error', 'message': 'Message is empty'}), 400
        new_msg = Chat(username='Anonim', message=message)
        db.session.add(new_msg)
        db.session.commit()
        return jsonify({'status': 'success'})
    except Exception as e:
        print("SEND ERROR:", e)
        return jsonify({'status': 'error', 'message': str(e)}), 500

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

with app.app_context():
    # Create the 'instance' folder if it doesn't exist
    if not os.path.exists(app.instance_path):
        os.makedirs(app.instance_path)
        print(f"Created instance folder at {app.instance_path}")

    # Define the database path
    db_path = os.path.join(app.instance_path, 'chat.db')

    # Check if the database file exists before creating tables
    if not os.path.exists(db_path):
        print(f"Database file not found at {db_path}. Creating database and tables...")
        db.create_all()
        print("Created database and tables!")
    else:
        # This part is crucial: if chat.db exists, it assumes tables are also there.
        print(f"Database file already exists at {db_path}.")