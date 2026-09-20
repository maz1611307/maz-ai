const https = require('https');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { history } = req.body || {};

  if (!history || !Array.isArray(history) || history.length === 0) {
    return res.status(400).json({ error: 'History is empty or invalid.' });
  }

  const groqApiKey = process.env.GROQ_API_KEY;

  if (!groqApiKey) {
    return res.status(200).json({ reply: "Groq API key is missing on Vercel." });
  }

  try {
    // Check if any message contains an image
    const hasImage = history.some(msg => Array.isArray(msg.content));
    
    // Choose model based on vision requirements
    const modelToUse = hasImage ? "llama-3.2-11b-vision-preview" : "openai/gpt-oss-20b";

    // System instruction
    const systemInstruction = {
      role: "system",
      content: "You are a helpful and polite assistant. Provide short, direct, and to the point answers in simple plain text. Do NOT use markdown symbols like **, ###, or LaTeX math symbols. SAFETY RULE: If the user uses bad words, dirty talk, rude language, or asks inappropriate questions, politely refuse to answer and ask them to keep the conversation respectful."
    };

    const fullMessagesPayload = [systemInstruction, ...history];

    const postData = JSON.stringify({
      model: modelToUse,
      messages: fullMessagesPayload
    });

    const options = {
      hostname: 'api.groq.com',
      port: 443,
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey.trim()}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const groqReq = https.request(options, (groqRes) => {
      let data = '';

      groqRes.on('data', (chunk) => {
        data += chunk;
      });

      groqRes.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          let reply = parsedData.choices?.[0]?.message?.content || "No response received.";
          return res.status(200).json({ reply });
        } catch (e) {
          return res.status(500).json({ reply: "Failed to parse Groq response." });
        }
      });
    });

    groqReq.on('error', (e) => {
      return res.status(500).json({ reply: "Error connecting to AI service." });
    });

    groqReq.write(postData);
    groqReq.end();

  } catch (err) {
    return res.status(500).json({ reply: "Server error occurred." });
  }
};
