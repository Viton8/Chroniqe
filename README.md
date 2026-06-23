# Chroniqe

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)

**Your personal chronology for everything you track.**

Chroniqe is a universal tracking platform for movies, series, games, books, and custom lists. Build a personal timeline of what you've watched, played, read, and plan to experience next.

## About

Chroniqe helps you organize media and hobbies in one place. Instead of scattered spreadsheets or multiple apps, you get a single dashboard for lists, ratings, notes, and statuses — your own chronology of experiences over time.

## Features

- **Authentication** — Register, log in, and manage your account (Supabase Auth)
- **Lists** — Create and organize tracking lists (movies, games, books, custom)
- **Items** — Add entries with title, description, and event dates
- **Ratings** — Score items on a 1–10 scale
- **Notes** — Attach personal notes to any item
- **Statuses** — Track progress: Planned, In Progress, Completed, Dropped
- **Dashboard** — Overview of recent activity and list summaries

> MVP features are being built incrementally. See [ROADMAP.md](ROADMAP.md) for current progress.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, TypeScript, Vite |
| Routing | React Router |
| Styling | Tailwind CSS |
| Backend | Supabase (Auth + PostgreSQL) |
| Hosting | GitHub Pages |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20 or later
- npm (included with Node.js)
- A [Supabase](https://supabase.com/) project (for backend features in later phases)

### Installation

```bash
git clone https://github.com/Viton8/Chroniqe.git
cd Chroniqe
npm install
```

### Environment Variables

Copy the example file and fill in your Supabase credentials:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous (public) API key |

See the [Supabase documentation](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs) for how to obtain these values.

### Development

```bash
npm run dev
```

Open [http://localhost:5173/Chroniqe/](http://localhost:5173/Chroniqe/) in your browser.

### Other Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |

## Project Structure

```
src/
├── assets/          # Static images and icons
├── components/
│   ├── layout/      # Navbar, Sidebar, AppLayout
│   └── ui/          # Shared UI components
├── context/         # React context providers (Auth, etc.)
├── hooks/           # Custom React hooks
├── pages/           # Route-level page components
├── services/        # Supabase client and API wrappers
├── App.tsx          # Route definitions
└── main.tsx         # Application entry point
```

## Roadmap

Development follows a phased plan from prototype to stable release:

- **v0.1** — Repository, docs, and layout shell
- **v0.2** — Authentication
- **v0.3** — List management
- **v0.4** — Dashboard statistics
- **v0.5** — TMDB movie metadata
- **v1.0** — Stable release

Full details: [ROADMAP.md](ROADMAP.md)

## Deployment

The app is configured for [GitHub Pages](https://pages.github.com/) with `base: '/Chroniqe/'` in `vite.config.ts`.

1. Build: `npm run build`
2. Deploy the `dist/` folder to GitHub Pages
3. Configure your Supabase project URL in production environment variables

CI/CD deployment workflow will be added in Phase 11. Until then, builds can be deployed manually.

## License

This project is licensed under the [MIT License](LICENSE).

## Author

**Maxim** — [GitHub](https://github.com/Viton8)
