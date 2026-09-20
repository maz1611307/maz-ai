const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const groqApiKey = process.env.GROQ_API_KEY;

module.exports = async function handler(req, res) {
  // 1. GET User Chat History
  if (req.method === 'GET') {
    const { user_email } = req.query;
    if (!user_email) return res.status(400).json({ error: 'User email required' });

    if (!supabaseUrl || !supabaseKey) {
      return res.status(200).json({ messages: [] });
    }

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/chat_messages?user_email=${encodeURIComponent(user_email)}&order=created_at.asc`, {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        }
      });
      const data = await response.json();
      return res.status(200).json({ messages: Array.isArray(data) ? data : [] });
    } catch (err) {
      return res.status(200).json({ messages: [] });
    }
  }

  // 2. POST New Message & Get AI Reply
  if (req.method === 'POST') {
    const { message, image, user_email, chat_id, chat_title } = req.body || {};

    if (!user_email || (!message && !image)) {
      return res.status(400).json({ error: 'User email and message or image required.' });
    }

    // Save user message to Supabase
    if (supabaseUrl && supabaseKey) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/chat_messages`, {
          method: "POST",
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
          },
          body: JSON.stringify({ 
            user_email, 
            chat_id, 
            chat_title, 
            role: 'user', 
            content: image ? "[Image Attached] " + (message || "") : message 
          })
        });
      } catch (err) {}
    }

    // Call Groq API
    let aiResponseText = "Groq API key is missing on Vercel.";
    if (groqApiKey) {
      try {
        // Select vision model if image is provided, otherwise text model
        let modelToUse = "openai/gpt-oss-20b";
        let messageContent = message || "What is in this image?";

        if (image) {
          modelToUse = "llama-3.2-11b-vision-preview";
          messageContent = [
            { type: "text", text: message || "Describe this image in simple detail." },
            { type: "image_url", image_url: { url: image } }
          ];
        }

        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${groqApiKey.trim()}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: modelToUse,
            messages: [
              { 
                role: "system", 
                content: "You are a helpful and polite assistant. Provide short, direct, and to the point answers in simple plain text. Do NOT use markdown symbols like **, ###, or LaTeX math symbols. SAFETY RULE: If the user uses bad words, dirty talk, rude language, or asks inappropriate questions, politely refuse to answer and ask them to keep the conversation respectful." 
              },
              { role: "user", content: messageContent }
            ]
          })
        });

        const groqData = await groqRes.json();
        
        if (groqData.error) {
          aiResponseText = "Groq Error: " + (groqData.error.message || "Invalid API call");
        } else {
          aiResponseText = groqData.choices?.[0]?.message?.content || "No response received.";
        }
      } catch (err) {
        aiResponseText = "Error connecting to Groq AI service.";
      }
    }

    // Save AI reply to Supabase
    if (supabaseUrl && supabaseKey) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/chat_messages`, {
          method: "POST",
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
          },
          body: JSON.stringify({ user_email, chat_id, chat_title, role: 'assistant', content: aiResponseText })
        });
      } catch (err) {}
    }

    return res.status(200).json({ reply: aiResponseText });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
