const line = require('@line/bot-sdk');
const express = require('express');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const config = require('./credential');

admin.initializeApp();

const app = express();
const client = new line.Client(config);
const db = admin.firestore();

app.use(line.middleware(config));

app.post('/', (req, res) => {
    Promise
        .all(req.body.events.map(handleEvent))
        .then((result) => res.json(result))
        .catch((err) => {
            console.error(err);
            res.status(500).end();
        });
});

async function handleEvent(event) {
    if (event.type !== 'message' || event.message.type !== 'text') {
        return Promise.resolve(null);
    }

    let timestamp = event.timestamp;
    let id = '';

    switch (event.source.type) {
        case 'user':
            id = event.source.userId;
            break;
        case 'group':
            id = event.source.groupId;
            break;
        case 'room':
            id = event.source.roomId;
            break;
    }

    let message = event.message.text;

    if (isCommand(message)) {
        let reply = await processCommand(message, id);
        let data = { type: 'text', text: reply };
        return client.replyMessage(event.replyToken, data);
    }

    await db.collection('chatrooms').doc(id).collection('chats').add({
        message: message,
        timestamp: timestamp,
        waktu: admin.firestore.FieldValue.serverTimestamp(),
    });

    return Promise.resolve(null);
}

function isCommand(text) {
    text = text.toLowerCase();

    if (text === 'salsaq tsundere mode on') return true;

    if (!text.startsWith('salsaq ')) return false;

    let arr = text.split(' ');
    if (arr.length > 3) return false;
    if (arr[1] === 'resend') {
        if (isNaN(arr[2])) return false;
    } else {
        if (isNaN(arr[1])) return false;
    }
    return true;
}

async function processCommand(message, id) {

    if (message.toLowerCase() === 'salsaq tsundere mode on') {
        return 'It\'s not like I wanted to follow your order or something you baka >_<';
    }

    let amount = 10;
    let x = message.split(' ')[message.split(' ').length - 1];
    if (x > 0) {
        if (x > 69) {
            amount = 69;
        } else {
            amount = parseInt(x);
        }
    }

    let result = await db.collection('chatrooms').doc(id)
        .collection('chats').orderBy('timestamp', 'desc')
        .limit(amount).get();

    if (result.empty) {
        return '>_<';
    }

    let reply = '';

    for (let i = result.docs.length - 1; i > -1; i--) {
        let data = result.docs[i].data();
        reply = reply.concat(data.message);
        if (i != 0) {
            reply = reply.concat('\n\n------------\n\n');
        }
    }

    return reply;
}

exports.bot = functions.region('asia-east2').https.onRequest(app);
