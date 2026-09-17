module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { message } = req.body;
        const prompt = message || 'Hello';
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ reply: 'Error: GROQ_API_KEY is not set in Vercel.' });
        }

        // Active supported Groq models
        const modelsToTry = [
            'llama-3.3-70b-versatile',
            'llama-3.1-8b-instant',
            'openai/gpt-oss-20b'
        ];

        let replyText = null;
        let lastError = null;

        for (const modelName of modelsToTry) {
            try {
                const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: modelName,
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.6
                    })
                });

                const data = await response.json();

                if (response.ok && data.choices && data.choices[0]?.message?.content) {
                    replyText = data.choices[0].message.content;
                    break;
                } else {
                    lastError = data.error?.message || `HTTP ${response.status}`;
                }
            } catch (err) {
                lastError = err.message;
            }
        }

        if (replyText) {
            return res.status(200).json({ reply: replyText });
        } else {
            return res.status(500).json({ reply: `Groq Error: ${lastError}` });
        }

    } catch (error) {
        console.error('Server Error:', error);
        return res.status(500).json({ reply: `Error: ${error.message}` });
    }
};
