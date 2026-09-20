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
    // Check if the latest user message contains an image
    const lastMessage = history[history.length - 1];
    const isLatestImage = Array.isArray(lastMessage?.content);

    // Active vision model on Groq
    const modelToUse = isLatestImage ? "llama-3.2-11b-vision-instruct" : "llama-3.3-70b-versatile";

    // Clean historical messages so base64 images from earlier turns don't break simple text chats
    const cleanedHistory = history.map((msg, index) => {
      if (index < history.length - 1 && Array.isArray(msg.content)) {
        const textObj = msg.content.find(c => c.type === "text");
        return {
          role: msg.role,
          content: textObj ? textObj.text : "[User sent an image]"
        };
      }
      return msg;
    });

    const systemInstruction = {
      role: "system",
      content: "You are a helpful and polite assistant. Provide clear and simple answers. Do not use complex markdown or LaTeX syntax."
    };

    const fullMessagesPayload = [systemInstruction, ...cleanedHistory];

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: fullMessagesPayload
      })
    });

    const data = await groqRes.json();

    if (data.error) {
      return res.status(200).json({ reply: `API Error: ${data.error.message}` });
    }

    let reply = data.choices?.[0]?.message?.content || "No response received.";

    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ reply: "Error connecting to server." });
  }
};
