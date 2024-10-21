require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const axios = require('axios');

const app = express();
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.use(bodyParser.json());

// Webhook for Messenger
app.post('/webhook', (req, res) => {
    const body = req.body;

    if (body.object === 'page') {
        body.entry.forEach(entry => {
            const webhook_event = entry.messaging[0];
            const senderId = webhook_event.sender.id;

            if (webhook_event.message && webhook_event.message.text) {
                const userMessage = webhook_event.message.text;
                handleUserMessage(senderId, userMessage);
            }
        });
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

// Handle user messages
async function handleUserMessage(senderId, message) {
    const responseMessage = await getAIResponse(message);
    sendTextMessage(senderId, responseMessage);
}

// Call OpenAI API for dynamic responses
async function getAIResponse(message) {
    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-3.5-turbo', // Adjust the model as needed
            messages: [{ role: 'user', content: message }],
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
        });

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Error with OpenAI API:', error);
        return "Sorry, I couldn't process that.";
    }
}

// Send messages
function sendTextMessage(senderId, text) {
    const messageData = {
        recipient: { id: senderId },
        message: { text: text },
    };

    request({
        uri: 'https://graph.facebook.com/v12.0/me/messages',
        qs: { access_token: PAGE_ACCESS_TOKEN },
        method: 'POST',
        json: messageData,
    }, (error, response, body) => {
        if (!error && response.statusCode === 200) {
            console.log('Message sent successfully');
        } else {
            console.error('Error sending message:', response.statusCode, response.statusMessage);
        }
    });
}

// Start server
app.listen(process.env.PORT || 3000, () => {
    console.log('Webhook is listening');
});
