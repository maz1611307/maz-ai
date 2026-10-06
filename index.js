const express = require('express');
const path = require('path');
const app = express();

// Increase the JSON limit for base64 images
app.use(express.json({ limit: '10mb' })); 

// Load API Handler
const chatHandler = require('./api/chat.js');
app.post('/api/chat', chatHandler);

// Serve static frontend files
app.use(express.static(path.join(__dirname)));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

module.exports = app;
