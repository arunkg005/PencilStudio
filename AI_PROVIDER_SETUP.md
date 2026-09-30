# PencilStudio AI Provider Setup

PencilStudio keeps the application layer separate from the LLM provider. The frontend calls a provider-neutral AI client, and that client talks to a lightweight AI proxy. The proxy is responsible for selecting the configured provider and protecting the provider API key.

## Supported architecture

- React frontend remains static and deployable on GitHub Pages.
- Frontend AI calls go through `VITE_AI_API_URL`.
- A lightweight Node proxy handles `/api/ai/generate`.
- The proxy selects the configured provider and normalizes the returned JSON.
- The selected provider may change without rewriting the feature pages.

## Current provider configuration

The default provider is:

- Provider: `gemini`
- Model: `gemini-3.8-flash`

This is the initial implementation because Gemini remains a practical free-tier option for many student use cases, but the architecture is not hard-coded to Gemini.

## How to change providers

1. Edit the environment variables in the proxy environment.
2. Set `AI_PROVIDER` to the new provider name.
3. Set `AI_MODEL` to a supported model for that provider.
4. Add the matching API key for the selected provider.
5. Update the proxy adapter if the provider has a different API contract.

Example values for your local proxy environment:

```env
AI_PROVIDER=gemini
AI_MODEL=gemini-3.8-flash
GEMINI_API_KEY=your_api_key_here
PORT=8787
AI_RATE_LIMIT_WINDOW_MS=600000
AI_RATE_LIMIT_MAX_REQUESTS=20
VITE_AI_API_URL=http://localhost:8787
```

Or a different provider type in the future:

```env
AI_PROVIDER=groq
AI_MODEL=llama-3.1-8b-instant
GROQ_API_KEY=your_key_here
```

## Where API keys belong

Never put provider API keys in frontend code, Vite env files, or GitHub Pages build output. Keep secrets only in the proxy environment or server-side deployment platform.

The frontend may only expose non-secret configuration such as:

```env
VITE_AI_API_URL=http://localhost:8787
```

## Free-tier notes

Free-tier availability changes frequently. Always verify the provider's current free-tier policy, rate limits, and model availability before relying on it in production.

Common considerations include:

- rate limits
- per-minute quotas
- request concurrency limits
- context window size
- structured-output support
- latency
- safety limitations

## Known limitations

- This implementation currently ships with a Gemini adapter because it is the initial supported provider.
- The rate limiter is intentionally simple and in-memory only, which is appropriate for a small prototype or single-instance environment.
- If the proxy or provider is unavailable, PencilStudio will surface a clear error instead of pretending that a real AI result was generated.
