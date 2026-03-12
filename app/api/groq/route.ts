import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GROQ_API_KEY not configured. Please add it in Settings > Vars.' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { prompt, systemPrompt, model, temperature, messages } = body;

    // Support both single prompt and multi-turn messages
    const chatMessages = messages || [
      { role: 'system', content: systemPrompt || 'You are a helpful CMS assistant.' },
      { role: 'user', content: prompt }
    ];

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model || 'llama-3.1-8b-instant',
        messages: chatMessages,
        temperature: temperature ?? 0.7,
        max_tokens: 2048
      })
    });

    if (!groqResponse.ok) {
      const errorData = await groqResponse.json();
      return NextResponse.json(
        { error: errorData.error?.message || `Groq API error: ${groqResponse.status}` },
        { status: groqResponse.status }
      );
    }

    const data = await groqResponse.json();
    
    return NextResponse.json({ 
      content: data.choices[0].message.content,
      model: data.model,
      usage: data.usage
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
