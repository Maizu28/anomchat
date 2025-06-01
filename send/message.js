// netlify/functions/send-message.js
const Pusher = require('pusher');

// Ganti dengan kredensial Pusher Anda
const {
    PUSHER_APP_ID,
    PUSHER_APP_KEY,
    PUSHER_APP_SECRET,
    PUSHER_APP_CLUSTER
} = process.env; // Ambil dari environment variables di Netlify

const pusher = new Pusher({
    appId: PUSHER_APP_ID,
    key: PUSHER_APP_KEY,
    secret: PUSHER_APP_SECRET,
    cluster: PUSHER_APP_CLUSTER,
    useTLS: true
});

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const data = JSON.parse(event.body);
        const { nickname, message, senderId } = data;

        if (!message || message.trim() === '') {
            return { statusCode: 400, body: JSON.stringify({ message: 'Message cannot be empty.' }) };
        }

        const payload = {
            nickname: nickname || 'Anonymous',
            message: message,
            timestamp: new Date().toISOString(),
            senderId: senderId // Teruskan senderId jika ada
        };

        // Trigger event 'new-message' di channel 'anonymous-chat'
        await pusher.trigger('anonymous-chat', 'new-message', payload);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Message sent successfully', payload })
        };

    } catch (error) {
        console.error('Error sending message:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to send message', error: error.message })
        };
    }
};