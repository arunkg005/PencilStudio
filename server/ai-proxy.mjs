import http from 'node:http';
import process from 'node:process';
import 'dotenv/config';

import { buildFeaturePrompt, buildSystemInstruction } from '../src/services/aiPrompts.js';
import { getProviderSettings, resolveProviderAdapter } from './providers/index.mjs';

const rateLimitWindowMs = Number(process.env.AI_RATE_LIMIT_WINDOW_MS || 600000);
const rateLimitMaxRequests = Number(process.env.AI_RATE_LIMIT_MAX_REQUESTS || 20);
const rateLimitStore = new Map();
const allowedFeatures = new Set(['notes', 'quiz', 'flashcards', 'resume', 'presentation', 'mindmap', 'studyplan', 'tutor', 'ocrnotes']);

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
  response.end(JSON.stringify(payload));
};

const getClientIp = (request) => {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  if (Array.isArray(forwarded)) return forwarded[0]?.trim() || 'unknown';
  return request.socket?.remoteAddress || 'unknown';
};

const rateLimitExceeded = (ip) => {
  const now = Date.now();
  const history = rateLimitStore.get(ip) || [];
  const recent = history.filter((timestamp) => now - timestamp < rateLimitWindowMs);
  recent.push(now);
  rateLimitStore.set(ip, recent);
  return recent.length > rateLimitMaxRequests;
};

const parseJsonBody = (request) => new Promise((resolve, reject) => {
  let raw = '';
  request.on('data', (chunk) => {
    raw += chunk;
    if (raw.length > 1_000_000) {
      request.destroy();
      reject(new Error('Request body too large.'));
    }
  });
  request.on('end', () => {
    if (!raw.trim()) {
      resolve({});
      return;
    }

    try {
      resolve(JSON.parse(raw));
    } catch (error) {
      reject(new Error('Malformed JSON request body.'));
    }
  });
  request.on('error', reject);
});

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {});
    return;
  }

  if (request.method === 'GET' && request.url === '/api/health') {
    const settings = getProviderSettings();
    sendJson(response, 200, {
      success: true,
      data: {
        status: 'healthy',
        provider: settings.provider,
        model: settings.model,
        rateLimit: { windowMs: rateLimitWindowMs, maxRequests: rateLimitMaxRequests },
      },
    });
    return;
  }

  if (request.method !== 'POST' || request.url !== '/api/ai/generate') {
    sendJson(response, 404, { success: false, code: 'NOT_FOUND', message: 'Only POST /api/ai/generate is supported.' });
    return;
  }

  const clientIp = getClientIp(request);

  if (rateLimitExceeded(clientIp)) {
    sendJson(response, 429, {
      success: false,
      code: 'RATE_LIMITED',
      message: 'AI usage limit reached for this client. Please try again later.',
    });
    return;
  }

  try {
    const body = await parseJsonBody(request);
    const feature = String(body.feature || '').toLowerCase();
    const input = body.input || {};

    if (!feature || !allowedFeatures.has(feature)) {
      sendJson(response, 400, {
        success: false,
        code: 'INVALID_FEATURE',
        message: 'The selected AI feature is invalid or unsupported for this proxy.',
      });
      return;
    }

    const settings = getProviderSettings();
    const adapter = resolveProviderAdapter(settings.provider);
    const prompt = buildFeaturePrompt(feature, input);
    const systemInstruction = body.systemInstruction || buildSystemInstruction();

    const result = await adapter.generate({
      systemInstruction,
      prompt,
      schema: body.schema || null,
      maxTokens: Number(body.maxTokens) || 1200,
    });

    sendJson(response, 200, {
      success: true,
      data: result.data,
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    const message = error?.message || 'AI generation failed.';
    const code = message.toLowerCase().includes('rate') ? 'RATE_LIMITED' : error?.code || 'AI_REQUEST_FAILED';

    sendJson(response, 500, {
      success: false,
      code,
      message,
    });
  }
});

const port = Number(process.env.PORT || 8787);
server.listen(port, () => {
  console.log(`PencilStudio AI proxy listening on http://localhost:${port}`);
});
