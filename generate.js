// api/generate.js
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting by IP (simple in-memory store)
  const rateLimitStore = global.rateLimitStore || (global.rateLimitStore = new Map());
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 5 * 60 * 1000; // 5 minutes
  const maxRequests = 5; // 5 requests per 5 minutes per IP

  // Clean old entries
  for (const [ip, data] of rateLimitStore.entries()) {
    if (now - data.resetTime > windowMs) {
      rateLimitStore.delete(ip);
    }
  }

  // Check rate limit
  const clientData = rateLimitStore.get(clientIP) || { count: 0, resetTime: now };
  if (now - clientData.resetTime > windowMs) {
    clientData.count = 0;
    clientData.resetTime = now;
  }

  if (clientData.count >= maxRequests) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded. Please try again in a few minutes.',
      retryAfter: Math.ceil((windowMs - (now - clientData.resetTime)) / 1000)
    });
  }

  clientData.count++;
  rateLimitStore.set(clientIP, clientData);

  try {
    const { prompt, type } = req.body;

    if (!prompt || !type) {
      return res.status(400).json({ error: 'Missing prompt or type' });
    }

    // Validate prompt length (prevent abuse)
    if (prompt.length > 2000) {
      return res.status(400).json({ error: 'Prompt too long' });
    }

    // Your OpenAI API key (stored as environment variable)
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: "system", 
            content: "You are a professional HR expert. Generate comprehensive, well-structured HR documents."
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API Error:', errorData);
      return res.status(response.status).json({ 
        error: `OpenAI API Error: ${errorData.error?.message || response.statusText}` 
      });
    }

    const result = await response.json();
    
    if (result.choices && result.choices[0] && result.choices[0].message) {
      const content = result.choices[0].message.content.trim();
      
      // Log usage for monitoring
      console.log(`Generated ${type} content for IP: ${clientIP}, length: ${content.length}`);
      
      return res.status(200).json({ 
        content,
        usage: result.usage // Optional: return token usage
      });
    } else {
      return res.status(500).json({ error: 'Unexpected response format from OpenAI' });
    }

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}