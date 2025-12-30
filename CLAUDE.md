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

**IMPORTANT**: Always run the dev server on port 3011 - this matches the Google OAuth redirect URI configured in Google Cloud Console.

```bash
# Development
npm run dev -- -p 3011   # Start Next.js dev server on localhost:3011 (required for Google OAuth)

# Production build
npm run build            # Build Next.js app for production
npm start                # Start production server

# Linting
npm run lint             # Run ESLint

# Docker development (full stack with Supabase)
docker compose up        # Start all services
                        # - App: http://localhost:3005
                        # - Supabase Studio: http://localhost:54323
                        # - Supabase API: http://localhost:8005
                        # - PostgreSQL: localhost:54322

docker compose down      # Stop all services
```

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
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

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

The app uses multi-stage Docker builds (see `Dockerfile`):
1. **deps**: Install dependencies with `npm ci`
2. **builder**: Build Next.js app with standalone output
3. **runner**: Production image with minimal footprint

The `compose.yaml` orchestrates:
- Next.js app container
- Full Supabase stack (PostgreSQL, Auth, Storage, Realtime, Kong, Studio, Meta)

## Important Files

- `originplan.md`: Authoritative product requirements and technical constraints
- `compose.yaml`: Full Docker Compose stack definition
- `supabase/config.toml`: Supabase local configuration
- `components.json`: shadcn/ui configuration
