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
    // Check if the latest message includes an image
    const lastMessage = history[history.length - 1];
    const isLatestImage = Array.isArray(lastMessage?.content);

    // Use vision model for images, and gpt-oss-20b for text
    const modelToUse = isLatestImage ? "llama-3.2-90b-vision-preview" : "openai/gpt-oss-20b";

    // Clean old conversation history so past images don't cause errors
    const cleanedHistory = history.map((msg, index) => {
      // If it's an older message and contains image content, convert it to plain text
      if (index < history.length - 1 && Array.isArray(msg.content)) {
        const textObj = msg.content.find(c => c.type === "text");
        return {
          role: msg.role,
          content: textObj ? textObj.text : "[Uploaded Image]"
        };
      }
      return msg;
    });

    const requestBody = {
      model: modelToUse,
      messages: cleanedHistory
    };

    // Add reasoning effort only when using gpt-oss-20b
    if (!isLatestImage) {
      requestBody.reasoning_effort = "medium";
    }

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
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
