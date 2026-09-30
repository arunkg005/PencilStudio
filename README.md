# PencilStudio

PencilStudio is an AI-powered study workbench built around a graphite / paper visual language.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The build copies `index.html` to `404.html` so the React SPA can handle direct GitHub Pages route loads.

## GitHub Pages

The frontend is deployable as a static GitHub Pages site through the workflow in
`.github/workflows/deploy.yml`. GitHub Pages does not run the Node AI proxy, so
AI features require a separately hosted proxy URL configured as the build-time
`VITE_AI_API_URL` value. Never put a Gemini or other provider key in frontend
code or a `VITE_` variable.

For local development, copy `.env.example` to `.env`, add the provider key to
the server-side variables, start the proxy with `npm run proxy`, and start the
frontend with `npm run dev`.

## Planned tools

1. AI Resume Builder
2. AI Notes Generator
3. AI Presentation Generator
4. AI Mind Map Generator
5. Google Sheets Backend
6. AI Quiz / MCQ Generator
7. AI Subject Tutor
8. AI Flashcards
9. AI Study Planner
10. OCR Notes Summarizer
"# PencilStudio" 
