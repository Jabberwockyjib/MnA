# DealPulse Demo Guide

## Quick Start

```bash
# 1. Start the dev server (port 3011 required for Google OAuth)
npm run dev -- -p 3011

# 2. Start background workers
npm run worker

# 3. Set up demo data (optional - creates "Nexus Technologies" deal)
npx tsx scripts/setup-demo.ts

# 4. Generate a daily brief
npx tsx scripts/generate-demo-brief.ts
```

## Demo Scenario: Nexus Technologies Acquisition

A realistic M&A due diligence scenario showcasing DealPulse capabilities.

### The Story
- **Deal**: $45M acquisition of Nexus Technologies, an enterprise SaaS company
- **Stage**: Due diligence in progress
- **Timeline**: Targeting close in 6 weeks

### Key Demo Points

#### 1. Dashboard (/)
- Shows deal overview with real-time metrics
- **Documents**: 16 total (5 new in last 24 hours)
- **Activity**: Combined docs + emails activity
- **Blockers**: 2 active blockers requiring attention
- **Quick Insights**: Workstream count, team size, total documents

#### 2. Daily Briefs (/briefs)
**The core product value** - answers "What changed, what's blocked, what could hurt us?"

- **Progress Snapshot**: 63% overall, broken down by workstream
- **Blockers Identified**:
  - IP Assignment agreements missing from 3 engineers
  - TechCorp requires change-of-control consent
  - Customer concentration concerns flagged
  - Competitor activity detected
- **Risks**: Auto-detected from document analysis
- **Notable Communications**: Important emails surfaced

#### 3. Documents (/documents)
- All synced documents organized by status (New, Updated, Reviewed)
- Click any document to see:
  - AI-generated summary
  - Workstream assignment
  - Source system link
  - Status workflow controls

#### 4. Communications (/communications)
- Email threads with sentiment analysis
- Blocker badges on critical items
- Quick filtering by sentiment type

#### 5. Workstream Views (/deals/[id]/workstreams/[ws_id])
- Filtered document view per workstream
- Progress tracking at workstream level

#### 6. Settings (/settings → Deal Settings)
- Google Drive folder configuration
- Gmail label configuration
- Source monitoring status

### Demo Flow (5 minutes)

1. **Start at Dashboard** (30 sec)
   - "This is your deal command center"
   - Point out the metrics and status

2. **Show Daily Brief** (2 min)
   - "Every morning, DealPulse answers three questions..."
   - Walk through progress snapshot
   - Highlight blockers with age tracking
   - Show how everything links to evidence

3. **Documents Page** (1 min)
   - "Documents sync automatically from your shared folders"
   - Show status groupings
   - Click one to show AI summary

4. **Communications** (1 min)
   - "We surface the emails that matter"
   - Show blocker detection
   - Show sentiment highlighting

5. **Settings** (30 sec)
   - "Zero workflow disruption - just point us at your folders"
   - Show how easy configuration is

### Key Differentiators to Highlight

1. **Zero Workflow Disruption**: Users keep using email and shared folders
2. **Evidence-First**: Every insight links back to source documents/emails
3. **Executive-Ready**: Information-dense, scannable, no fluff
4. **AI-Assisted, Human-Controlled**: AI suggests, humans decide

### Resetting Demo Data

```bash
# Re-run setup to reset demo data
npx tsx scripts/setup-demo.ts

# Generate a fresh brief
npx tsx scripts/generate-demo-brief.ts
```

## Technical Notes

- Dev server must run on port 3011 (Google OAuth redirect URI)
- Workers must be running for syncs and brief generation
- Demo data is isolated to "Nexus Technologies Acquisition" deal
