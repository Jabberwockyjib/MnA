

⸻

DealPulse

Product Requirements, Technical Stack & Execution Order

(Authoritative Implementation Plan – No Code, No Dates)

⸻

1. Product North Star (highest priority)

DealPulse exists to answer ONE question, every day, without user effort:

“What changed in this deal since yesterday, what’s blocked, and what could hurt us?”

All architecture, UI, AI usage, and infrastructure choices must serve this outcome.

⸻

2. Core Product Promise

After two days of real use, a deal lead must feel:
	•	Status chasing is eliminated
	•	Important changes are surfaced automatically
	•	Email no longer hides critical work
	•	The daily brief is more trustworthy than spreadsheets

If this is not true, the system is considered incomplete.

⸻

3. Hard Product Constraints (non-negotiable)

These constraints exist to protect usability and speed to revenue.
	1.	Zero workflow disruption
	•	Users continue using email and shared folders
	•	No forced task entry
	•	No required email routing changes
	2.	Evidence-first system
	•	All insights link back to documents or emails
	•	AI outputs are suggestions, never conclusions
	•	Human confirmation is always possible
	3.	Read-heavy, write-light UX
	•	Most users consume information
	•	Inputs are limited to confirm / dismiss / mark reviewed
	4.	One deal done well
	•	Portfolio views are out of scope
	•	The product must excel at a single active deal

⸻

4. Technical Stack (locked)

Developers must adhere to this stack unless explicitly approved otherwise.

4.1 Application Layer
	•	Next.js (App Router)
	•	TypeScript
	•	Server Actions / Route Handlers
	•	Deployed in Docker containers

4.2 UI System
	•	Tailwind CSS (design tokens, layout, spacing)
	•	shadcn/ui (core UI primitives)
	•	Magic UI (motion, bento layouts, animated lists, subtle emphasis)

UI Expectations
	•	Information-dense, executive-grade
	•	Motion only when it improves comprehension
	•	No decorative animation

⸻

4.3 Backend & Data
	•	Supabase (self-hosted in VPS, Dockerized)
	•	PostgreSQL
	•	Auth
	•	Storage
	•	Row Level Security (RLS)
	•	pgvector enabled (future semantic search)
	•	No multi-tenant shortcuts
Tenant isolation must be enforced at the database layer.

⸻

4.4 Background Processing
	•	Redis
	•	Queue-based workers (separate container)
	•	All heavy work is asynchronous:
	•	Document ingestion
	•	OCR
	•	Email parsing
	•	Daily brief generation

⸻

4.5 Hosting & Infrastructure
	•	Single VPS
	•	Docker Compose
	•	Caddy (reverse proxy + TLS)
	•	Nightly encrypted backups (database + storage)

⸻

5. Core Functional Requirements (ordered by importance)

5.1 Deal Workspace (foundation)

Each deal includes:
	•	Deal metadata
	•	Standard workstreams (Legal, HR, IT, Finance, Ops)
	•	Team members with roles:
	•	Admin
	•	Member
	•	Viewer

Expectation:
A deal can be created and made operational without technical help.

⸻

5.2 Source Monitoring (critical path)

DealPulse must observe work without interfering.

Required sources
	•	One document repository (Google Drive or SharePoint)
	•	One email system (Gmail or Outlook)

System responsibilities
	•	Detect new documents
	•	Detect document updates
	•	Detect new or active email threads related to the deal

System limitations
	•	Never modifies source files
	•	Never sends emails
	•	Never enforces naming rules

⸻

5.3 Document Awareness (not document management)

For each document:
	•	Name
	•	Location
	•	Date added / updated
	•	Auto-generated summary
	•	Workstream classification (editable)
	•	Status:
	•	New
	•	Updated
	•	Reviewed

Expectation:
Users can instantly see what changed since the last brief.

⸻

5.4 Email Awareness (minimal but essential)

DealPulse must:
	•	Capture relevant email threads
	•	Group messages logically
	•	Detect language indicating:
	•	Blockers
	•	Waiting conditions
	•	Review requests

DealPulse must NOT:
	•	Replace email clients
	•	Require special CC/BCC usage
	•	Guarantee perfect NLP accuracy

Expectation:
Important conversations are visible without searching inboxes.

⸻

5.5 Daily Deal Brief (the product)

This is the primary output.

Generated automatically once per day.

The Daily Brief must contain:
	1.	Progress Snapshot
	•	Overall progress
	•	Progress by workstream
	•	Change vs previous brief
	2.	What Changed
	•	New documents
	•	Updated documents
	•	Review status changes
	3.	Blockers
	•	Explicit blockers
	•	Inferred blockers (stalled activity)
	•	Aging and ownership where possible
	4.	Risks & Exceptions
	•	Highlighted clauses or issues
	•	Severity classification
	•	Mandatory citations
	5.	Notable Communications
	•	Email threads suggesting confusion, delay, or risk

Expectation:
The brief is executive-ready with no edits.

⸻

6. UX Expectations (developers must comply)

6.1 Design Principles
	•	Clarity over novelty
	•	Scannability over aesthetics
	•	Consistency across pages
	•	Minimal interaction cost

6.2 Required Screens
	1.	Authentication / onboarding
	2.	Deal dashboard
	3.	Documents index
	4.	Document viewer
	5.	Communications view
	6.	Daily brief archive

No additional screens unless explicitly approved.

⸻

7. AI Usage Rules

AI may:
	•	Summarize content
	•	Detect changes
	•	Suggest risks or blockers

AI may not:
	•	Make decisions
	•	Replace human judgment
	•	Hide uncertainty

All AI outputs must:
	•	Be labeled as suggestions
	•	Include citations
	•	Be reversible by users

⸻

8. Quality & Security Expectations
	•	Strict tenant isolation via RLS
	•	No cross-deal visibility
	•	Signed, time-limited document access
	•	Full audit trail for:
	•	Risk confirmation
	•	Review actions
	•	Source connections

⸻

9. Revenue-Driven Design Assumptions

Developers should assume:
	•	Buyers want fast setup
	•	Deals are short-lived
	•	Value must appear immediately
	•	Email delivery of insights matters

Design decisions should favor:
	•	Reliability
	•	Predictability
	•	Fast onboarding

Over:
	•	Feature completeness
	•	Edge-case perfection
	•	Long-term workflow complexity

⸻

10. Innovation Boundaries (where creativity is allowed)

Innovation is encouraged in:
	•	Change detection
	•	Blocker inference
	•	Citation clarity
	•	Brief readability

Innovation is discouraged in:
	•	Workflow invention
	•	UI novelty
	•	Feature expansion
	•	Custom configuration complexity

⸻

11. Definition of Success

DealPulse is considered successful when:
	•	Status meetings become shorter or unnecessary
	•	Users trust the daily brief
	•	Risks are surfaced earlier
	•	The product can be sold after a single demo