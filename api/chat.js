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

    // Use Groq's vision model for images, gpt-oss-20b for plain text.
    // As of now, qwen/qwen3.8-27b is Groq's only supported vision model
    // (the earlier llama-3.2-vision and llama-4 scout/maverick vision models were retired).
    const modelToUse = isLatestImage
      ? "qwen/qwen3.8-27b"
      : "openai/gpt-oss-20b";

    // Clean old conversation history so past images don't cause errors
    // (only the LATEST message is allowed to carry image content)
    const cleanedHistory = history.map((msg, index) => {
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

    // reasoning_effort is only supported by gpt-oss-20b
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
