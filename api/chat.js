module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({ reply: 'Error: Only POST method allowed' });
  }

  const { message } = req.body || {};
  if (!message) {
    return res.status(200).json({ reply: 'Error: No message sent' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  // Check if keys are loaded in Vercel
  if (!supabaseUrl || !supabaseKey || !groqKey) {
    return res.status(200).json({ 
      reply: `Missing Environment Keys in Vercel! (SUPABASE_URL: ${!!supabaseUrl}, SUPABASE_ANON_KEY: ${!!supabaseKey}, GROQ_API_KEY: ${!!groqKey})` 
    });
  }

  try {
    // Send request to Groq API
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are MAZ AI, created by MUHAMMAD ALI ZAHID. Keep replies simple.' },
          { role: 'user', content: message }
        ]
      })
    });

    const groqData = await groqRes.json();

    if (!groqRes.ok) {
      return res.status(200).json({ 
        reply: `Groq API Error: ${groqData.error?.message || JSON.stringify(groqData)}` 
      });
    }

    const reply = groqData.choices?.[0]?.message?.content || "No reply received from Groq.";

    // Save to Supabase
    try {
      await fetch(`${supabaseUrl}/rest/v1/chat_messages`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify([
          { role: 'user', content: message },
          { role: 'assistant', content: reply }
        ])
      });
    } catch (dbErr) {
      console.error("Supabase Save Error:", dbErr);
    }

    return res.status(200).json({ reply });

  } catch (err) {
    return res.status(200).json({ reply: `Server Exception: ${err.message}` });
  }
};
