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
      const response = await fetch(`${supabaseUrl}/rest/v1/chat_messages?user_email=eq.${encodeURIComponent(user_email)}&order=created_at.asc`, {
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
    const { message, user_email, chat_id, chat_title } = req.body || {};

    if (!user_email || !message) {
      return res.status(400).json({ error: 'User email and message required.' });
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
          body: JSON.stringify({ user_email, chat_id, chat_title, role: 'user', content: message })
        });
      } catch (err) {}
    }

    // Call Groq API with Mixtral model
    let aiResponseText = "Groq API key is missing on Vercel.";
    if (groqApiKey) {
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${groqApiKey.trim()}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-120b / 20b",
            messages: [{ role: "user", content: message }]
          })
        });

        const groqData = await groqRes.json();
        
        if (groqData.error) {
          aiResponseText = "Groq Error: " + (groqData.error.message || "Invalid response");
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
