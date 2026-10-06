module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { history, think } = req.body || {};

  if (!history || !Array.isArray(history) || history.length === 0) {
    return res.status(400).json({ error: 'History is empty or invalid.' });
  }

  const groqApiKey = process.env.GROQ_API_KEY;

  if (!groqApiKey) {
    return res.status(200).json({ reply: "Groq API key is missing on Vercel." });
  }

  try {
    const lastMessage = history[history.length - 1];

    // Check if the latest message includes image content (uploaded image)
    const isUploadedImage = Array.isArray(lastMessage?.content) &&
      lastMessage.content.some(item => item.type === "image_url");

    // Extract last user text
    let lastUserText = '';
    if (typeof lastMessage.content === 'string') {
      lastUserText = lastMessage.content;
    } else if (Array.isArray(lastMessage.content)) {
      const textObj = lastMessage.content.find(c => c.type === 'text');
      if (textObj) lastUserText = textObj.text;
    }

    // ===== IMAGE GENERATION DETECTION =====
    const imageKeywords = [
      'draw', 'draw me', 'draw a', 'draw an',
      'generate image', 'generate an image', 'generate a image',
      'make an image', 'make image', 'make a image',
      'create image', 'create an image', 'create a image',
      'picture of', 'image of', 'picture a', 'image a',
      'illustrate', 'paint', 'sketch',
      'show me an image', 'show an image', 'show me a picture'
    ];

    const lowerText = lastUserText.toLowerCase();
    const wantsImage = imageKeywords.some(kw => lowerText.includes(kw));

    if (wantsImage && !isUploadedImage) {
      // Extract prompt — remove trigger keywords
      let prompt = lastUserText;
      imageKeywords.forEach(kw => {
        prompt = prompt.replace(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
      });
      prompt = prompt.replace(/^\s*[:\-]?\s*/, '').trim();
      if (!prompt) prompt = lastUserText;

      const encodedPrompt = encodeURIComponent(prompt);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&model=turbo&nologo=true`;

      return res.status(200).json({
        reply: `Here's your image of "${prompt}":\n\n![Generated Image](${imageUrl})`,
        isImage: true
      });
    }
    // ===== END IMAGE GENERATION =====

    // Use Groq's vision model for uploaded images, text model otherwise
    const modelToUse = isUploadedImage
      ? "qwen/qwen3.8-27b"
      : "openai/gpt-oss-120b";

    // Clean old conversation history so past images don't cause errors
    const cleanedHistory = history.map((msg, index) => {
      if (index < history.length - 1 && Array.isArray(msg.content)) {
        const textObj = msg.content.find(c => c.type === "text");
        return {
          role: msg.role,
          content: textObj ? textObj.text : "[Uploaded Image]"
        };
      }
      return msg;
    });

    const basePrompt = "You are MAZ AI. If anyone asks who owns you, who created you, who developed you, or who your owner/developer is, always answer that you were created and are owned by Muhammad Ali Zahid. Do not mention OpenAI, Meta, Groq, or any underlying model provider as your creator or owner.";

    const systemMessage = {
      role: "system",
      content: think
        ? basePrompt + " Think step by step. Show your reasoning clearly. Break complex problems into parts. Then give a final answer."
        : basePrompt + " Always give short, direct, and concise answers by default. Do NOT provide lengthy explanations unless the user specifically asks you to explain, elaborate, or describe in detail."
    };

    const requestBody = {
      model: modelToUse,
      messages: [systemMessage, ...cleanedHistory]
    };

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    const data = await groqRes.json();

    if (data.error) {
      return res.status(200).json({ reply: `API Error: ${data.error.message}` });
    }

    let reply = data.choices?.[0]?.message?.content || "No response received.";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Chat handler error:', err);
    return res.status(500).json({ reply: "Error connecting to server." });
  }
};
