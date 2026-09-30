const extractJson = (rawText) => {
  const text = String(rawText || '').trim();
  if (!text) return null;

  const fenced = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      // fall through to plain parse below
    }
  }

  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
};

export async function generateWithGemini({ systemInstruction, prompt, schema, maxTokens = 1200 }) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.AI_MODEL || 'gemini-3.8-flash';

  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY. Add it to the proxy environment before enabling AI generation.');
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemInstruction || 'You are the AI reasoning engine for PencilStudio.' }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: Math.max(256, Number(maxTokens) || 1200),
        temperature: 0.35,
        responseMimeType: 'application/json',
        ...(schema ? { responseSchema: schema } : {}),
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error?.message || 'Gemini request failed.';
    throw new Error(message);
  }

  const rawText = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n') || '';

  if (!rawText.trim()) {
    throw new Error('The configured provider returned an empty response.');
  }

  const parsed = extractJson(rawText);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('The configured provider returned malformed JSON.');
  }

  return {
    success: true,
    data: parsed,
    provider: 'gemini',
    model,
  };
}
