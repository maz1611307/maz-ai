module.exports = async function handler(req, res) {
  try {
    const { message } = req.body || {};

    let groqKey = process.env.GROQ_API_KEY;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!groqKey) {
      return res.status(200).json({ reply: "Error: GROQ_API_KEY is missing in Vercel Settings!" });
    }

    groqKey = groqKey.trim();

    // 1. Fetch chat history from Supabase
    let history = [];
    if (supabaseUrl && supabaseKey) {
      try {
        const historyRes = await fetch(`${supabaseUrl.trim()}/rest/v1/chat_messages?select=role,content&order=id.asc&limit=10`, {
          headers: {
            'apikey': supabaseKey.trim(),
            'Authorization': `Bearer ${supabaseKey.trim()}`
          }
        });
        if (historyRes.ok) {
          const historyData = await historyRes.json();
          if (Array.isArray(historyData)) history = historyData;
        }
      } catch (e) {
        console.error("Supabase error:", e);
      }
    }

    // 2. Call Groq API
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'You are MAZ AI, created by MUHAMMAD ALI ZAHID. Keep replies short and simple.' },
          ...history,
          { role: 'user', content: message || 'hello' }
        ]
      })
    });

    const groqData = await groqRes.json();

    if (!groqRes.ok) {
      return res.status(200).json({ reply: `Groq Key Error: ${groqData.error?.message || 'Invalid API Key'}` });
    }

    const reply = groqData.choices[0].message.content;

    // 3. Save to Supabase
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
        console.error("Save error:", dbErr);
      }
    }

    return res.status(200).json({ reply });

  } catch (err) {
    return res.status(200).json({ reply: `Server Error: ${err.message}` });
  }
};
