module.exports = async function handler(req, res) {
  try {
    const { message } = req.body || {};

    let openrouterKey = process.env.OPENROUTER_API_KEY;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!openrouterKey) {
      return res.status(200).json({ reply: "Error: OPENROUTER_API_KEY is missing in Vercel!" });
    }

    openrouterKey = openrouterKey.trim();

    // 1. Fetch chat history from Supabase
    let history = [];
    if (supabaseUrl && supabaseKey) {
      try {
        const historyRes = await fetch(`${supabaseUrl.trim()}/rest/v1/chat_messages?select=role,content&order=id.asc&limit=8`, {
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

    // 2. Call OpenRouter with NVIDIA Nemotron
    const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-3-super-120b-a12b:free',
        messages: [
          { 
            role: 'system', 
            content: 'You are MAZ AI, created by MUHAMMAD ALI ZAHID. Answer clearly, accurately, and smartly.' 
          },
          ...history,
          { role: 'user', content: message || 'hello' }
        ]
      })
    });

    const aiData = await aiRes.json();

    if (!aiRes.ok) {
      return res.status(200).json({ reply: `OpenRouter Error: ${aiData.error?.message || 'API error'}` });
    }

    const reply = aiData.choices[0].message.content;

    // 3. Save reply to Supabase
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
