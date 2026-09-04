# Architecture

Chroniqe is a React SPA on GitHub Pages talking to Supabase. Access is enforced with Postgres RLS and `private` helper functions (`SECURITY DEFINER`, `search_path = ''`) so policies do not recurse.

## Data model (high level)

Lists store a JSON **schema** (fields + constraints), **view_config**, and **settings** (check-off, transfer buttons, on-check actions). Items store a JSON **values** map keyed by field id.

| Table | Role |
|-------|------|
| `profiles` | Public profile for `auth.users` |
| `friendships` | Friend requests / accepted pairs |
| `lists` | List metadata, schema, visibility, edit mode |
| `list_members` | viewer / editor / proposer |
| `list_invites` | Pending invites |
| `items` | Rows; `is_checked` + `check_snapshot` for undo |
| `item_ratings` | Multi-user ratings per field |
| `item_comments` | Comments on items |
| `change_proposals` | Suggested creates/updates; applied via `review_proposal` |
| `list_subscriptions` | Follow list changes → notifications |
| `list_automations` | Extra triggers/actions |
| `list_charts` | Saved chart templates |
| `activity_events` | Audit |
| `notifications` | In-app events |
| `files` | Upload metadata + scan status |

Visibility: `private` · `invite` · `friends` · `public`.  
Edit mode: `owner` · `selected` · `friends` · `proposals`.

`move_item` copies a row to another list with an optional field map.

## Storage

- `avatars` — public, 2 MB, jpeg/png/webp/gif
- `list-files` — private, 10 MB, images + pdf/csv/json/txt

After upload the client calls Edge Function `validate-file` (magic bytes / JSON parse). Rejected files are deleted. SVG and executables are never accepted.

## Routes

Public: `/`, `/login`, `/register`, `/forgot`, `/reset-password`, `/explore`, `/lists/:id` (if visible).  
Signed-in: dashboard, lists, new list, friends, notifications, profile, settings.

## Related

- [README.md](../README.md)
- [supabase/README.md](../supabase/README.md)
