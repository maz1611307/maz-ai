const express = require('express');
const app = express();
const chatHandler = require('./api/chat.js');

app.use(express.json());
app.post('/api/chat', chatHandler);

module.exports = app;
