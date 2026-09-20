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
    const modelToUse = "openai/gpt-oss-20b";

    // Clean old history to convert image objects into simple text
    const cleanedHistory = history.map((msg) => {
      if (Array.isArray(msg.content)) {
        const textObj = msg.content.find(c => c.type === "text");
        return {
          role: msg.role,
          content: textObj ? textObj.text : "[Uploaded Content]"
        };
      }
      return msg;
    });

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: cleanedHistory,
        reasoning_effort: "medium"
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
