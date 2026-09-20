const groqApiKey = process.env.GROQ_API_KEY;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { history } = req.body || {};

  if (!history || !Array.isArray(history) || history.length === 0) {
    return res.status(400).json({ error: 'History is empty or invalid.' });
  }

  if (!groqApiKey) {
    return res.status(200).json({ reply: "Groq API key is missing on Vercel." });
  }

  try {
    // Check if any message in the current conversation contains an image
    const hasImage = history.some(msg => Array.isArray(msg.content));
    
    // Choose model based on vision requirements
    const modelToUse = hasImage ? "llama-3.2-11b-vision-preview" : "openai/gpt-oss-20b";

    // System instruction to guide AI style
    const systemInstruction = {
      role: "system",
      content: "You are a helpful and polite assistant. Provide short, direct, and to the point answers in simple plain text. Do NOT use markdown symbols like **, ###, or LaTeX math symbols. SAFETY RULE: If the user uses bad words, dirty talk, rude language, or asks inappropriate questions, politely refuse to answer and ask them to keep the conversation respectful."
    };

    // Combine system message with conversation memory
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

    const groqData = await groqRes.json();
    let reply = groqData.choices?.[0]?.message?.content || "No response received.";

    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ reply: "Error connecting to AI service." });
  }
};
