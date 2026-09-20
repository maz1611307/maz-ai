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

  // Updated system prompt: Only mention creator if explicitly asked
  const systemMessage = {
    role: "system",
    content: "You are MAZ AI, a helpful and smart AI assistant. Answer the user's questions directly without intro greetings. Do NOT state who created or owns you in every message. ONLY state that you were created and owned by Muhammad Ali Zahid if the user specifically asks who created, built, or owns you."
  };

  try {
    const formattedMessages = [systemMessage, ...history];

    const response = await fetch("[https://api.groq.com/openai/v1/chat/completions](https://api.groq.com/openai/v1/chat/completions)", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: formattedMessages,
        temperature: 0.7
      })
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "No response received.";

    return res.status(200).json({ reply });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch response from Groq API." });
  }
};
