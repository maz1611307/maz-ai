const chatHandler = require('./api/chat.js');

module.exports = async (req, res) => {
    return await chatHandler(req, res);
};
