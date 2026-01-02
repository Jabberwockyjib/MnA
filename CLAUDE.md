# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**DealPulse** is an M&A deal intelligence platform that automatically monitors deals and surfaces changes, blockers, and risks through daily briefs. The product exists to answer: "What changed in this deal since yesterday, what's blocked, and what could hurt us?"

### Core Principles
- Zero workflow disruption: users continue using email and shared folders
- Evidence-first: all insights link back to documents or emails
- Read-heavy, write-light UX: most users consume information
- One deal done well: portfolio views are out of scope

## Available MCP Servers

This repository has access to the following MCP servers when working with Claude Code:

### Context7 MCP
- **Purpose**: Fetch up-to-date documentation for libraries and frameworks
- **Usage**: Use `resolve-library-id` to find the correct library ID, then `get-library-docs` to retrieve documentation
- **When to use**: When you need current documentation for Next.js, React, Supabase, Tailwind, or other dependencies

### GitHub MCP
- **Purpose**: Interact with GitHub repositories, issues, pull requests, and code search
- **Key capabilities**:
  - Search code across repositories
  - Create/update issues and pull requests
  - Read file contents from repositories
  - Manage branches and commits
  - Search repositories, users, and code
- **When to use**: For GitHub operations, researching similar implementations, or working with remote repositories

### Playwright MCP
- **Purpose**: Browser automation and testing
- **Key capabilities**:
  - Navigate to URLs and interact with web pages
  - Take screenshots and snapshots
  - Fill forms and click elements
  - Run Playwright code snippets
  - Test web interfaces
- **When to use**: For end-to-end testing, browser automation, or debugging UI issues

## Development Commands

This project uses **Traefik** for routing per the dev/infra standards. No ports are exposed directly - all traffic routes through Traefik hostnames.

### One-Time Setup

1. **Add hosts entries** (run once):
   ```bash
   # Add to /etc/hosts
   127.0.0.1 dealpulse.local
   127.0.0.1 api.dealpulse.local
   127.0.0.1 studio.dealpulse.local
   ```

2. **Ensure Traefik is running** (from ~/dev/infra/traefik):
   ```bash
   docker compose up -d
   ```

3. **Ensure traefik_net exists**:
   ```bash
   docker network create traefik_net  # Only if not already created
   ```

### Daily Development

```bash
# Terminal 1: Start Supabase stack
docker compose up -d

# Terminal 2: Start Next.js dev server (runs on host for hot reload)
npm run dev -- -p 3011

# Access via Traefik hostnames:
# - App:            http://dealpulse.local
# - Supabase API:   http://api.dealpulse.local
# - Supabase Studio: http://studio.dealpulse.local
# - Traefik Dashboard: http://traefik.local (for debugging routes)
```

### Other Commands

```bash
# Production build
npm run build            # Build Next.js app for production
npm start                # Start production server

# Linting
npm run lint             # Run ESLint

# Stop services
docker compose down      # Stop all services
```

### Troubleshooting

If routes don't work:
1. Is Traefik running? `docker ps | grep traefik`
2. Are containers on traefik_net? `docker network inspect traefik_net`
3. Is the dev server running on port 3011?
4. Check Traefik dashboard at http://traefik.local

## Tech Stack

### Application
- **Next.js 16** (App Router) with TypeScript
- **React 19** with Server Components and Server Actions
- **Tailwind CSS 4** for styling
- **shadcn/ui** for UI primitives
- **Magic UI** for motion and bento layouts (information-dense, executive-grade UI)

### Backend
- **Supabase** (self-hosted, Dockerized)
  - PostgreSQL with pgvector extension (for future semantic search)
  - Authentication (GoTrue)
  - Storage
  - Row Level Security (RLS) for tenant isolation
- **Docker Compose** orchestrates all services (app, db, auth, storage, realtime, kong gateway)

### Important Configuration
- `next.config.ts`: Sets `output: "standalone"` for Docker deployment
- Path alias: `@/*` maps to project root
- TypeScript target: ES2017

## Architecture

### Route Structure

```
app/
├── (authenticated)/        # Protected routes with sidebar layout
│   ├── layout.tsx         # SidebarProvider + AppSidebar
│   ├── dashboard/         # Main deal dashboard
│   ├── deals/[id]/workstreams/[ws_id]/  # Workstream-specific views
│   └── actions.ts         # Server actions for authenticated features
├── login/                 # Authentication pages
│   ├── page.tsx
│   └── actions.ts         # Auth-related server actions
├── layout.tsx             # Root layout with metadata
├── page.tsx               # Landing/redirect page
└── globals.css            # Global Tailwind styles
```

### Supabase Integration

**Client Creation:**
- Client-side: `lib/supabase/client.ts` using `createBrowserClient`
- Server-side: `lib/supabase/server.ts` using `createServerClient` with Next.js cookies

**Environment Variables Required:**
- `NEXT_PUBLIC_SUPABASE_URL` - Browser-facing API URL (http://api.dealpulse.local)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anonymous key
- `SUPABASE_INTERNAL_URL` - Docker internal URL (http://kong:8000) for workers

### Database Schema

Core tables (see `supabase/migrations/20250101000000_initial_schema.sql`):

- **profiles**: User profiles (auto-created on signup via trigger)
- **deals**: Deal metadata (name, status)
- **deal_members**: User access to deals (admin, member, viewer roles)
- **workstreams**: Deal workstreams (Legal, HR, Finance, IT, Ops)
- **documents**: Document metadata (source tracking, summaries, status)
- **emails**: Email thread metadata (sentiment, blocker detection)

**RLS Pattern:**
All tables use Row Level Security with the `is_deal_member()` helper function to enforce tenant isolation. Users can only access data for deals they're members of.

**Current Development State:**
A second migration (`20250101000001_disable_rls.sql`) temporarily disables RLS for development. This should be reverted before production.

### UI Components

Located in `components/`:
- `components/ui/`: shadcn/ui primitives (sidebar, avatar, separator, etc.)
- `components/layout/`: App-specific layout components
  - `app-sidebar.tsx`: Main navigation with workstreams list
- `components/deals/`: Deal-specific components

**Styling:**
Use the `cn()` utility from `lib/utils.ts` to merge Tailwind classes with clsx.

## Key Development Patterns

### Server Actions
Place server actions in `actions.ts` files colocated with route groups. Use Next.js Server Actions for data mutations.

### Authentication State
Currently in development mode with minimal auth enforcement. The sidebar fetches the most recent active deal without user filtering.

### Data Fetching
- Server Components: Use `createClient()` from `lib/supabase/server.ts`
- Client Components: Use `createClient()` from `lib/supabase/client.ts`

## Product Constraints

### UI Expectations
- Information-dense, executive-grade interfaces
- Motion only when it improves comprehension (no decorative animation)
- Scannability over aesthetics
- Minimal interaction cost

### Functional Scope
Do not implement features outside these core areas without explicit approval:
1. Deal workspace management
2. Source monitoring (Google Drive, SharePoint, Gmail, Outlook)
3. Document awareness (not document management)
4. Email awareness (minimal but essential)
5. Daily deal brief generation

### AI Usage Rules
- AI may: summarize content, detect changes, suggest risks/blockers
- AI may not: make decisions, replace human judgment, hide uncertainty
- All AI outputs must: be labeled as suggestions, include citations, be reversible

## Docker Deployment

### Traefik Infrastructure

This project follows the dev/infra Traefik standards:
- **No direct port binding** - All routing via Traefik hostnames
- **App runs on host** - Next.js dev server runs natively for hot reload
- **Supabase in Docker** - Full stack containerized with internal networking
- **External traefik_net** - Shared network for Traefik routing

### Production Builds

The app uses multi-stage Docker builds (see `Dockerfile`):
1. **deps**: Install dependencies with `npm ci`
2. **builder**: Build Next.js app with standalone output
3. **runner**: Production image with minimal footprint

### compose.yaml Services

The `compose.yaml` orchestrates the Supabase stack:
- **kong** - API Gateway (routed via `api.dealpulse.local`)
- **db** - PostgreSQL (internal only, no host port)
- **studio** - Dashboard (routed via `studio.dealpulse.local`)
- **auth** - GoTrue authentication
- **rest** - PostgREST API
- **realtime** - Real-time subscriptions
- **storage** - File storage
- **meta** - Postgres management
- **redis** - Job queue (internal only)
- **worker** - Background job processor

## Important Files

- `originplan.md`: Authoritative product requirements and technical constraints
- `compose.yaml`: Full Docker Compose stack definition
- `supabase/config.toml`: Supabase local configuration
- `components.json`: shadcn/ui configuration
