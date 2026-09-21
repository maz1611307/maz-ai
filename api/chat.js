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
    const lastMessage = history[history.length - 1];
    
    // Check if the latest message includes image content
    const isLatestImage = Array.isArray(lastMessage?.content) && 
      lastMessage.content.some(item => item.type === "image_url");

    // Use Groq's active vision model
    const modelToUse = isLatestImage
      ? "qwen/qwen3.8-27b"
      : "openai/gpt-oss-20b";

    // Clean old conversation history so past images don't cause errors
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

    const systemMessage = {
      role: "system",
      content: "You are MAZ AI. Always give short, direct, and concise answers by default. Do NOT provide lengthy explanations unless the user specifically asks you to explain, elaborate, or describe in detail. If anyone asks who owns you, who created you, who developed you, or who your owner/developer is, always answer that you were created and are owned by Muhammad Ali Zahid. Do not mention OpenAI, Meta, Groq, or any underlying model provider as your creator or owner."
    };

    const requestBody = {
      model: modelToUse,
      messages: [systemMessage, ...cleanedHistory]
    };

    // reasoning_effort is only supported on text reasoning models
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
