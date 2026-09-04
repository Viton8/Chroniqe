# Contributing to Chroniqe

Thank you for your interest in contributing! This guide covers conventions and the pull request process.

## Getting Started

1. Fork the repository and clone your fork.
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and add your Supabase credentials.
4. Run the dev server: `npm run dev`
5. Create a branch for your work (see naming below).

## Branch Naming

Use descriptive prefixes:

| Prefix | Use for |
|--------|---------|
| `feature/` | New features (e.g. `feature/list-crud`) |
| `fix/` | Bug fixes (e.g. `fix/login-redirect`) |
| `docs/` | Documentation only |
| `chore/` | Tooling, dependencies, CI |

## Commit Messages

- Use the **imperative mood**: "Add list form" not "Added list form"
- Keep the subject line under 72 characters
- Reference issue numbers when applicable: `Fix login redirect (#42)`

Examples:

```
Add Supabase profiles migration
Fix sidebar active state on nested routes
Update README deployment instructions
```

## Code Standards

### ESLint + Prettier

- Run `npm run lint` before committing — all checks must pass
- Run `npm run format` to auto-format with Prettier
- `eslint-config-prettier` disables rules that conflict with Prettier
- `prettier-plugin-tailwindcss` sorts Tailwind classes automatically

### Component Naming

- **Pages:** `PascalCase` + `Page` suffix (e.g. `DashboardPage.tsx`)
- **Components:** `PascalCase` (e.g. `ListCard.tsx`)
- **Hooks:** `camelCase` with `use` prefix (e.g. `useLists.ts`)
- **Services:** `camelCase` files exporting named functions or a client instance

### TypeScript

- Prefer explicit types for function parameters and return values on exported APIs
- Avoid `any`; use `unknown` and narrow when needed
- Colocate component-specific types in the same file unless shared

### Styling

- Use Tailwind utility classes
- Extract repeated patterns into components, not custom CSS, unless necessary
- Follow the existing layout patterns in `src/components/layout/`

## Pull Request Checklist

Before opening a PR, confirm:

- [ ] `npm run lint` passes with no errors
- [ ] `npm run build` succeeds
- [ ] Changes are scoped to the stated purpose (no unrelated refactors)
- [ ] No secrets, API keys, or `.env` files are included
- [ ] New environment variables are documented in `.env.example`
- [ ] Documentation is updated if behavior or setup changes

## Pull Request Description

Use the PR template (auto-filled on GitHub). Include:

1. **What** changed and **why**
2. **How to test** the changes locally
3. Screenshots for UI changes (if applicable)

## Questions

Open a [GitHub issue](https://github.com/Viton8/Chroniqe/issues) for bugs, feature requests, or discussion.
