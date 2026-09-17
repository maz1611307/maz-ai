const chatHandler = require('./api/chat.js');

module.exports = (req, res) => {
    return chatHandler(req, res);
};
