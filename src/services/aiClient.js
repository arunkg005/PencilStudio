const resolveEnvironment = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env) return import.meta.env;
  return {};
};

const buildProxyUrl = () => {
  const env = resolveEnvironment();
  const configured = String(env.VITE_AI_API_URL || '').trim();
  if (!configured) return '';
  return configured.replace(/\/$/, '') + '/api/ai/generate';
};

const normalizeError = (error, fallbackCode = 'AI_REQUEST_FAILED') => {
  if (error && typeof error === 'object') {
    if (error.code) return { success: false, code: error.code, message: error.message || 'AI request failed.' };
    if (error.message) return { success: false, code: fallbackCode, message: error.message };
  }

  return {
    success: false,
    code: fallbackCode,
    message: typeof error === 'string' ? error : 'AI request failed.',
  };
};

export async function callAI({ feature, input = {}, schema, systemInstruction } = {}) {
  const endpoint = buildProxyUrl();

  if (!endpoint) {
    return {
      success: false,
      code: 'AI_PROXY_UNAVAILABLE',
      message: 'AI proxy is not configured. Set VITE_AI_API_URL to your PencilStudio AI proxy endpoint.',
    };
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature, input, schema, systemInstruction }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      return normalizeError(
        payload && payload.message ? { code: payload.code || 'AI_REQUEST_FAILED', message: payload.message } : 'AI request failed.',
        payload?.code || 'AI_REQUEST_FAILED',
      );
    }

    if (!payload || payload.success !== true || payload.data === undefined) {
      return {
        success: false,
        code: 'AI_INVALID_RESPONSE',
        message: 'The AI service returned an invalid payload.',
      };
    }

    return {
      success: true,
      data: payload.data,
      provider: payload.provider || 'unknown',
      model: payload.model || 'unknown',
    };
  } catch (error) {
    return normalizeError(error, 'AI_REQUEST_FAILED');
  }
}
