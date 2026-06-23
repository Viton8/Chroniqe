# Chroniqe Roadmap

This roadmap tracks version milestones and development phases for Chroniqe.

## Version Milestones

| Version | Focus | Status |
|---------|-------|--------|
| **v0.1** | Prototype — repository, scaffold, layout shell | In progress |
| **v0.2** | Authentication — Supabase Auth flow | Planned |
| **v0.3** | Lists — list CRUD | Planned |
| **v0.4** | Statistics — dashboard stats | Planned |
| **v0.5** | TMDB — movie metadata integration | Planned |
| **v1.0** | Stable release | Planned |

---

## Development Phases

### Phase 1: Repository and Planning

**Goal:** Establish the project foundation with documentation, tooling, and repository hygiene.

**Deliverables:**
- [x] README, ROADMAP, ARCHITECTURE, CONTRIBUTING docs
- [x] MIT license and `.gitignore`
- [x] GitHub issue/PR templates and CI workflow stub
- [x] `.env.example` for Supabase credentials

**Status:** Complete

---

### Phase 2: React + Vite Setup

**Goal:** Scaffold the frontend application with routing, layout shell, and developer tooling.

**Deliverables:**
- [x] Vite + React + TypeScript project
- [x] Tailwind CSS, React Router, Supabase client stub
- [x] Page stubs and layout components (Navbar, Sidebar, AppLayout)
- [x] ESLint + Prettier configuration
- [ ] Auth guards and protected routes (Phase 4)

**Status:** In progress

---

### Phase 3: Supabase Integration + Schema

**Goal:** Connect to Supabase and deploy the initial database schema.

**Deliverables:**
- [ ] Supabase project configuration
- [ ] Migration: `profiles`, `lists`, `items` tables
- [ ] Row Level Security policies
- [ ] Typed API service layer

**Status:** Planned

---

### Phase 4: Authentication

**Goal:** Full user authentication flow.

**Deliverables:**
- [ ] Register, login, logout
- [ ] Password recovery
- [ ] Auth context with session management
- [ ] Protected routes

**Status:** Planned

---

### Phase 5: List Management

**Goal:** CRUD operations for tracking lists.

**Deliverables:**
- [ ] Create, read, update, delete lists
- [ ] List icons and metadata
- [ ] Lists page UI

**Status:** Planned

---

### Phase 6: Item Management

**Goal:** Track individual items within lists.

**Deliverables:**
- [ ] Item CRUD
- [ ] Ratings (1–10 scale)
- [ ] Notes and descriptions
- [ ] Statuses: Planned, In Progress, Completed, Dropped
- [ ] Event dates

**Status:** Planned

---

### Phase 7: Dashboard

**Goal:** Central overview of user activity.

**Deliverables:**
- [ ] Recent activity feed
- [ ] List summaries
- [ ] Quick navigation

**Status:** Planned

---

### Phase 8: Statistics Engine

**Goal:** Aggregate and visualize tracking data.

**Deliverables:**
- [ ] Completion rates and averages
- [ ] Status breakdowns
- [ ] Time-based insights

**Status:** Planned

---

### Phase 9: TMDB Integration

**Goal:** Enrich movie and series entries with external metadata.

**Deliverables:**
- [ ] TMDB API integration
- [ ] Search and auto-fill for media items
- [ ] Posters and metadata display

**Status:** Planned

---

### Phase 10: Social Features

**Goal:** Sharing and collaboration (future scope).

**Deliverables:**
- [ ] Friends system
- [ ] Shared lists
- [ ] Activity feeds

**Status:** Future

---

### Phase 11: Testing + CI/CD

**Goal:** Automated quality checks and deployment.

**Deliverables:**
- [x] CI workflow (lint + build on push/PR)
- [ ] Unit and integration tests
- [ ] GitHub Pages deploy workflow
- [ ] Preview deployments for PRs

**Status:** Planned

---

### Phase 12: Production Release

**Goal:** Ship v1.0 stable release.

**Deliverables:**
- [ ] Performance optimization
- [ ] Accessibility audit
- [ ] Documentation finalization
- [ ] v1.0 release tag

**Status:** Planned
