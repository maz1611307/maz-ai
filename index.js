const express = require('express');
const path = require('path');
const app = express();
const chatHandler = require('./api/chat.js');

app.use(express.json());

// Serve static files like index.html
app.use(express.static(path.join(__dirname)));

// API route
app.post('/api/chat', chatHandler);

// Serve frontend on root route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

module.exports = app;
