export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if API key exists
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not found in environment variables');
      return res.status(500).json({ error: 'API key not configured' });
    }

    const { prompt, type, model = 'gpt-4o-mini', max_tokens = 2000, temperature = 0.7 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('Generating content for type:', type);

    // Direct fetch to OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content: "You are a professional HR and career expert. Generate high-quality, detailed content based on the user's requirements."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: max_tokens,
        temperature: temperature,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('OpenAI API error:', errorData);
      return res.status(openaiResponse.status).json({ 
        error: errorData.error?.message || 'OpenAI API error' 
      });
    }

    const data = await openaiResponse.json();
    const content = data.choices[0].message.content;
    
    console.log('Content generated successfully');
    res.status(200).json({ content });

  } catch (error) {
    console.error('API Error:', error.message);
    res.status(500).json({ error: 'Failed to generate content: ' + error.message });
  }
}
