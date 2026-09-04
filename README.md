# Chroniqe

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)

**Your personal chronology for everything you track.**

Chroniqe is a flexible list platform: custom fields, sharing, transfers between lists, ratings from any number of people, charts, and a calm mobile-first UI.

## Features

- **Accounts** — registration, login, password reset, profiles
- **Custom lists** — any number of fields (text, numbers, dates, images, files, ratings, nested lists, …) with constraints
- **Visibility** — private, invite-only, friends, public
- **Editing** — owner, selected people, friends, or anyone via change proposals
- **Check-off + automations** — strike items and run actions (set date, move to another list, undo)
- **Transfers** — e.g. watchlist → watched / won’t watch; shopping → bought / later
- **Views** — table, cards, board, gallery, timeline, compact rows
- **Charts** — timeline, stem/scatter, bar, line, pie, KPIs; templates saved on the list
- **Comments, friends, subscriptions, notifications**
- **Import / export** — JSON and CSV
- **Uploads** — type, size, and content checks (SVG/HTML/executables rejected)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, TypeScript, Vite |
| Routing | React Router |
| Styling | Tailwind CSS |
| Backend | Supabase (Auth, PostgreSQL, Storage, Edge Functions) |
| Hosting | GitHub Pages (`base: /Chroniqe/`) |

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com/) project

### Installation

```bash
git clone https://github.com/Viton8/Chroniqe.git
cd Chroniqe
npm install
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Anon or publishable key |

Apply SQL from `supabase/migrations/` in the Supabase SQL editor (or CLI). Deploy `supabase/functions/validate-file`.

In **Authentication → URL configuration** add:

- `http://localhost:5173/Chroniqe/**`
- your GitHub Pages origin, e.g. `https://viton8.github.io/Chroniqe/**`

### Development

```bash
npm run dev
```

Open [http://localhost:5173/Chroniqe/](http://localhost:5173/Chroniqe/).

| Command | Description |
|---------|-------------|
| `npm run build` | Type-check and production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## Project Structure

```
src/
├── components/      # layout, UI, fields, list views, charts
├── context/         # Auth, toasts
├── lib/             # templates, validation, export, automations
├── pages/
├── services/        # Supabase client and API
└── types/
supabase/
├── migrations/
└── functions/validate-file/
```

## License

[MIT](LICENSE) — **Maxim** ([GitHub](https://github.com/Viton8))
