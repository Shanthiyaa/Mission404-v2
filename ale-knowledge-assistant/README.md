# ALE Knowledge Assistant - Frontend

Enterprise React UI for the ALE internal AI document assistant.

## Quick start

```bash
npm install
npm run dev
```

`npm run dev` starts both the FastAPI backend on http://127.0.0.1:8001 and the Vite frontend on http://localhost:5173.

## Login credentials

Create an account with Sign up first, then use that email and password to sign in.

## Pages

- `/login` - Sign in
- `/signup` - Create account
- `/dashboard` - Stats, activity, recent docs
- `/chat` - AI assistant with typing animation, citations, confidence scores
- `/upload` - Drag-and-drop PDF upload with pipeline status
- `/knowledge-base` - Searchable, filterable document table
- `/settings` - Theme toggle, model selector, preferences

## Tech stack

- React 18 + TypeScript
- React Router v6
- Tailwind CSS
- Lucide React icons
- Framer Motion

## Backend

The frontend calls `/api/*`. In development, Vite proxies those requests to the FastAPI app in `../ai-document-qa-system-2026`.
