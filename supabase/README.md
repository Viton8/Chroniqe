# Supabase

Remote project: apply the SQL in `migrations/` (or the equivalent already applied via the dashboard). Then deploy:

```
supabase/functions/validate-file
```

Buckets `avatars` and `list-files` are created in the migration, with MIME and size limits plus storage RLS.

Auth redirect URLs must include the Vite base path `/Chroniqe/`.
