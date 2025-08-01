import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Set this in Vercel environment variables
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, type, model = 'gpt-4o-mini', max_tokens = 2000, temperature = 0.7 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

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
    
    res.status(200).json({ content });
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ error: 'Failed to generate content' });
  }
}
