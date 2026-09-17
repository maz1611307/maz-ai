require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: message }] }]
            })
        });
        const data = await response.json();
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response received.";
        res.json({ reply: replyText });
    } catch (error) {
        res.status(500).json({ reply: "Error connecting to AI service." });
    }
});

// Replace this string with your actual Supabase connection URL from earlier
const DATABASE_URL = "postgresql://postgres:maz_1611%40Ali@db.ggmbxaklicgoczqwrepe.supabase.co:5432/postgres";

// Replace this string with your actual Supabase connection URL from earlier
const DATABASE_URL = "postgresql://postgres:maz_1611%40Ali@db.ggmbxaklicgoczqwrepe.supabase.co:5432/postgres";


app.post('/api/run-code', async (req, res) => {
  const { source_code, language } = req.body; 
  const lang = (language || 'python').toLowerCase();

  const fileNames = {
    python: 'main.py',
    javascript: 'main.js',
    cpp: 'main.cpp',
    c: 'main.c',
    java: 'Main.java'
  };

  try {
    const response = await fetch(`https://glot.io/api/run/${lang}?version=latest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: [{ name: fileNames[lang] || 'main.txt', content: source_code }]
      })
    });

    const data = await response.json();
    res.json({ stdout: data.stdout || "No output", stderr: data.stderr || "No errors" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;
