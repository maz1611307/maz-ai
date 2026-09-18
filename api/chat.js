module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (!supabaseUrl || !supabaseKey || !groqKey) {
    return res.status(500).json({ error: 'Missing environment variables in Vercel settings.' });
  }

  try {
    let history = [];

    // Fetch history safely
    try {
      const historyRes = await fetch(`${supabaseUrl}/rest/v1/chat_messages?select=role,content&order=id.asc&limit=10`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        if (Array.isArray(historyData)) history = historyData;
      }
    } catch (e) {
      console.error('Supabase fetch error:', e);
    }

    // Call Groq API
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are MAZ AI, created by MUHAMMAD ALI ZAHID. Keep replies clear and simple.' },
          ...history,
          { role: 'user', content: message }
        ]
      })
    });

    const groqData = await groqRes.json();

    if (!groqRes.ok || !groqData.choices || !groqData.choices[0]) {
      return res.status(500).json({ error: groqData.error?.message || 'Groq API request failed.' });
    }

    const reply = groqData.choices[0].message.content;

    // Save messages safely
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
    } catch (e) {
      console.error('Supabase save error:', e);
    }

    return res.status(200).json({ reply });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};
