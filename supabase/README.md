# Supabase

Database migrations and Supabase configuration for Chroniqe.

## Status

Migrations will be added in **Phase 3** (Supabase Integration + Schema).

## Planned Structure

```
supabase/
├── migrations/
│   └── 001_initial_schema.sql   # profiles, lists, items + RLS
└── README.md
```

## Schema Overview

See [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) for the full schema reference.

## Setup (Phase 3)

1. Create a project at [supabase.com](https://supabase.com/)
2. Copy project URL and anon key to `.env`
3. Run migrations via Supabase CLI or SQL editor
4. Verify RLS policies before connecting the frontend
