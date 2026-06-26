# ALE Knowledge Assistant — Frontend

Enterprise React UI for the ALE internal AI document assistant.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Login credentials (demo)
Any email/password works — click "Sign in" to enter.

## Pages
- `/login` — Sign in
- `/signup` — Create account
- `/dashboard` — Stats, activity, recent docs
- `/chat` — AI assistant with typing animation, citations, confidence scores
- `/upload` — Drag-and-drop PDF upload with pipeline status
- `/knowledge-base` — Searchable, filterable document table
- `/settings` — Theme toggle, model selector, preferences

## Tech stack
- React 18 + TypeScript
- React Router v6
- Tailwind CSS (dark mode via `class` strategy)
- Lucide React icons
- Framer Motion (installed, ready to use)

## Connecting to your Python backend
The chat page currently simulates responses. To wire it to your real Streamlit/Python backend:
1. Replace the `setTimeout` in `Chat.tsx` `send()` function with a real `fetch()` call to your API
2. Your API should accept `{ question: string }` and return `{ answer: string, source_file: string, page: number, confidence: number }`
