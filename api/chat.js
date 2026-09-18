module.exports = async function handler(req, res) {
  return res.status(200).json({ reply: "Backend is working!" });
};
