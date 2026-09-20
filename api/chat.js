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
    // Check if any message in history contains an image payload
    const hasImage = history.some(msg => Array.isArray(msg.content));

    // Valid Groq Model IDs
    const modelToUse = hasImage ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile";

    const systemInstruction = {
      role: "system",
      content: "You are a helpful and polite assistant. Provide clear and helpful answers. SAFETY RULE: If the user uses bad words or inappropriate language, politely refuse to answer."
    };

    const fullMessagesPayload = [systemInstruction, ...history];

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
      console.error("Groq Error:", data.error);
      return res.status(200).json({ reply: `API Error: ${data.error.message || 'Check model name or API key.'}` });
    }

    let reply = data.choices?.[0]?.message?.content || "No response received from model.";

    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ reply: "Error connecting to server." });
  }
};
