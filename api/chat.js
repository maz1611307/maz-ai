module.exports = async function handler(req, res) {
  try {
    const { message } = req.body || {};

    let groqKey = process.env.GROQ_API_KEY;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!groqKey) {
      return res.status(200).json({ reply: "Error: GROQ_API_KEY is missing in Vercel!" });
    }

    groqKey = groqKey.trim();

    // 1. Fetch recent chat history from Supabase
    let history = [];
    if (supabaseUrl && supabaseKey) {
      try {
        const historyRes = await fetch(`${supabaseUrl.trim()}/rest/v1/chat_messages?select=role,content&order=id.desc&limit=6`, {
          headers: {
            'apikey': supabaseKey.trim(),
            'Authorization': `Bearer ${supabaseKey.trim()}`
          }
        });
        if (historyRes.ok) {
          const historyData = await historyRes.json();
          if (Array.isArray(historyData)) {
            history = historyData.reverse().map(item => ({
              role: item.role,
              content: item.content
            }));
          }
        }
      } catch (e) {
        console.error("Supabase fetch error:", e);
      }
    }

    // 2. Call Groq API with concise response rules
    const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [
          { 
            role: 'system', 
            content: 'You are MAZ AI, created by MUHAMMAD ALI ZAHID. Be extremely concise, direct, and to the point. If the user asks for a definition or a simple question, give ONLY the core definition or answer in 1-2 short sentences. Do NOT add unnecessary background, extra details, formulas, or long explanations unless specifically asked for.' 
          },
          ...history,
          { role: 'user', content: message || 'hello' }
        ]
      })
    });

    const aiData = await aiRes.json();

    if (!aiRes.ok || aiData.error) {
      return res.status(200).json({ reply: `Groq Error: ${aiData.error?.message || 'Failed to generate response'}` });
    }

    const reply = aiData.choices?.[0]?.message?.content || "No reply from Groq";

    // 3. Save current user message and AI reply to Supabase
    if (supabaseUrl && supabaseKey) {
      try {
        await fetch(`${supabaseUrl.trim()}/rest/v1/chat_messages`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey.trim(),
            'Authorization': `Bearer ${supabaseKey.trim()}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify([
            { role: 'user', content: message },
            { role: 'assistant', content: reply }
          ])
        });
      } catch (dbErr) {
        console.error("Supabase save error:", dbErr);
      }
    }

    return res.status(200).json({ reply });

  } catch (err) {
    return res.status(200).json({ reply: `Server Error: ${err.message}` });
  }
};
