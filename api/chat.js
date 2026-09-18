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

  try {
    // 1. Fetch chat history directly from Supabase REST API
    const historyRes = await fetch(`${supabaseUrl}/rest/v1/chat_messages?select=role,content&order=id.asc&limit=10`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    const history = await historyRes.json();

    // 2. Build messages array with system prompt and history
    const messages = [
      {
        role: 'system',
        content: 'You are MAZ AI, created by MUHAMMAD ALI ZAHID. Remember chat context and keep replies simple.'
      },
      ...(Array.isArray(history) ? history : []),
      { role: 'user', content: message }
    ];

    // 3. Send message to Groq API
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: messages
      })
    });

    const data = await groqRes.json();

    if (!data.choices || !data.choices[0]) {
      throw new Error('Groq API error: ' + JSON.stringify(data));
    }

    const reply = data.choices[0].message.content;

    // 4. Save message and reply into Supabase database
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

    return res.status(200).json({ reply });

  } catch (err) {
    console.error('Server Error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};
