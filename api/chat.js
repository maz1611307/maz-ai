import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const groqApiKey = process.env.GROQ_API_KEY;

const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

export default async function handler(req, res) {
  // 1. GET User Chat History
  if (req.method === 'GET') {
    const { user_email } = req.query;
    if (!user_email) return res.status(400).json({ error: 'User email required' });
    if (!supabase) return res.status(500).json({ error: 'Supabase credentials missing in Vercel' });

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_email', user_email)
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ messages: data || [] });
  }

  // 2. POST New Message & Get AI Reply
  if (req.method === 'POST') {
    const { message, user_email, chat_id, chat_title } = req.body || {};

    if (!user_email || !message) {
      return res.status(400).json({ error: 'User email and message required.' });
    }

    // Save user message to Supabase
    if (supabase) {
      await supabase.from('chat_messages').insert([
        { user_email, chat_id, chat_title, role: 'user', content: message }
      ]);
    }

    // Call Groq API
    let aiResponseText = "Groq API key is missing on Vercel.";
    if (groqApiKey) {
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${groqApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: message }]
          })
        });

        const groqData = await groqRes.json();
        aiResponseText = groqData.choices?.[0]?.message?.content || "No response received.";
      } catch (err) {
        aiResponseText = "Error generating response from AI.";
      }
    }

    // Save AI message to Supabase
    if (supabase) {
      await supabase.from('chat_messages').insert([
        { user_email, chat_id, chat_title, role: 'assistant', content: aiResponseText }
      ]);
    }

    return res.status(200).json({ reply: aiResponseText });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
