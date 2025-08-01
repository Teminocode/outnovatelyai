import OpenAI from 'openai';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
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

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const { prompt, type, model = 'gpt-4o-mini', max_tokens = 2000, temperature = 0.7 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('Generating content for type:', type);

    const completion = await openai.chat.completions.create({
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
    });

    const content = completion.choices[0].message.content;
    
    console.log('Content generated successfully');
    res.status(200).json({ content });

  } catch (error) {
    console.error('API Error:', error.message);
    
    if (error.code === 'invalid_api_key') {
      return res.status(401).json({ error: 'Invalid OpenAI API key' });
    }
    
    if (error.code === 'insufficient_quota') {
      return res.status(429).json({ error: 'OpenAI quota exceeded' });
    }
    
    res.status(500).json({ error: 'Failed to generate content: ' + error.message });
  }
}
