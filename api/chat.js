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

  // System prompt
  const systemMessage = {
    role: "system",
    content: "You are MAZ AI, a helpful and smart AI assistant. Answer the user's questions directly. Do NOT state who created or owns you unless the user specifically asks."
  };

  try {
    // Format messages for Groq API
    const formattedMessages = [
      systemMessage,
      ...history.map(msg => {
        // Ensure string content stays simple text
        if (typeof msg.content === 'string') {
          return { role: msg.role, content: msg.content };
        }
        return msg;
      })
    ];

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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

    if (data.error) {
      console.error("Groq API Error:", data.error);
      return res.status(200).json({ reply: `API Error: ${data.error.message || 'Something went wrong.'}` });
    }

    const reply = data.choices?.[0]?.message?.content || "No response received from model.";
    return res.status(200).json({ reply });

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ reply: "Server error occurred. Please try again." });
  }
};
