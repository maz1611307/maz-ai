import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // 1. Get history for logged in user
  if (req.method === 'GET') {
    const { user_email } = req.query;
    if (!user_email) return res.status(400).json({ error: 'User email required' });

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_email', user_email)
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ messages: data });
  }

  // 2. Save user message & AI reply
  if (req.method === 'POST') {
    const { message, user_email, chat_id, chat_title, think } = req.body;

    if (!user_email) {
      return res.status(400).json({ error: 'User email is required to save chat.' });
    }

    // Save user message
    await supabase.from('chat_messages').insert([
      { user_email, chat_id, chat_title, role: 'user', content: message }
    ]);

    // Send request to Groq API
    let aiResponseText = "";
    try {
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: message }]
        })
      });

      const groqData = await groqRes.json();
      aiResponseText = groqData.choices[0]?.message?.content || "No response received.";
    } catch (err) {
      aiResponseText = "Error generating response.";
    }

    // Save AI response to database
    await supabase.from('chat_messages').insert([
      { user_email, chat_id, chat_title, role: 'assistant', content: aiResponseText }
    ]);

    return res.status(200).json({ reply: aiResponseText });
  }
}
