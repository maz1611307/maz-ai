import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Fetch last 10 messages from Supabase
    const { data: history } = await supabase
      .from('chat_messages')
      .select('role, content')
      .order('id', { ascending: true })
      .limit(10);

    // Build message context with strict system prompt
    const messages = [
      {
        role: 'system',
        content: 'You are MAZ AI, created by MUHAMMAD ALI ZAHID. Always remember previous conversation context. Keep responses clear and simple.'
      },
      ...(history || []),
      { role: 'user', content: message }
    ];

    // Call Groq API
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: messages
      })
    });

    const data = await groqResponse.json();
    const reply = data.choices[0].message.content;

    // Save user message and AI response to Supabase
    await supabase.from('chat_messages').insert([
      { role: 'user', content: message },
      { role: 'assistant', content: reply }
    ]);

    return res.status(200).json({ reply });

  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
}
