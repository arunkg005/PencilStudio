import { generateWithGemini } from './gemini.mjs';

export function getProviderSettings() {
  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
  const model = process.env.AI_MODEL || 'gemini-3.8-flash';
  const apiKey = process.env.GEMINI_API_KEY || '';

  return { provider, model, apiKey };
}

export function resolveProviderAdapter(provider = 'gemini') {
  switch (provider) {
    case 'gemini':
      return { name: 'gemini', generate: generateWithGemini };
    default:
      throw new Error(`AI provider "${provider}" is not supported yet.`);
  }
}
