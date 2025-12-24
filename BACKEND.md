# DealPulse Backend Features

This document describes the backend intelligence features implemented for DealPulse.

## Overview

The backend implements the core product intelligence features from `originplan.md`:
- **Daily Brief Generation** (Section 5.5) - The primary output
- **Document Intelligence** (Section 5.3) - AI-powered summaries and risk detection
- **Email Awareness** (Section 5.4) - Sentiment analysis and blocker detection

## AI Integration

### Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure API Key**
   Add to `.env.local`:
   ```
   ANTHROPIC_API_KEY=your_api_key_here
   ```

### AI Modules

Located in `lib/ai/`:

#### `client.ts`
- Core Anthropic SDK integration
- `generateCompletion()` - Generate text completions
- `generateStructuredResponse()` - Generate JSON responses

#### `document-intelligence.ts`
- `summarizeDocument()` - Generate executive summaries
- `detectRisks()` - Identify risks with severity classification
- `classifyDocument()` - Auto-classify documents by workstream

#### `email-intelligence.ts`
- `analyzeEmail()` - Sentiment and blocker detection
- `detectBlockerInThread()` - Identify blockers in email threads

## Daily Brief Generation

### Core Service

**File**: `lib/services/brief-generator.ts`

The brief generator analyzes deal data and produces:

1. **Progress Snapshot**
   - Overall completion percentage
   - Progress by workstream (Legal, HR, Finance, IT, Ops)
   - Change vs previous brief

2. **What Changed**
   - New documents added (last 24 hours)
   - Updated documents
   - Reviewed document count

3. **Blockers**
   - Emails marked as blockers
   - Stalled documents (no update in 7+ days)
   - Age tracking for each blocker

4. **Risks & Exceptions**
   - High-priority documents requiring review
   - AI-detected risks (when integrated)

5. **Notable Communications**
   - Recent important emails
   - Deadline/approval/urgent threads

### API Endpoint

**Route**: `/api/briefs/generate`

**POST Request**:
```bash
curl -X POST http://localhost:3000/api/briefs/generate \
  -H "Content-Type: application/json" \
  -d '{"dealId": "your-deal-id"}'
```

**GET Request** (for testing):
```bash
curl http://localhost:3000/api/briefs/generate?dealId=your-deal-id
```

### Server Actions

**File**: `app/(authenticated)/actions.ts`

- `createMockBrief(dealId)` - Create test brief with sample data
- `generateAIBrief(dealId)` - Generate real brief using AI service
- `summarizeDocumentWithAI(documentId)` - Generate AI summary for document

### UI Integration

**Briefs Page**: `/briefs`

Two generation options:
1. **Mock Brief** - Creates sample data for testing
2. **Generate AI Brief** - Analyzes actual deal data

## Document Intelligence

### Features

1. **Auto-Summarization**
   - Executive-ready 2-3 sentence summaries
   - Focus: key terms, obligations, risks, deadlines

2. **Risk Detection**
   - Identifies potential deal-breakers
   - Severity classification (low/medium/high)
   - Direct citations from documents

3. **Workstream Classification**
   - Auto-assigns documents to correct workstream
   - Confidence scoring

### Usage

```typescript
import { summarizeDocument, detectRisks } from '@/lib/ai/document-intelligence'

// Generate summary
const summary = await summarizeDocument(
    'NDA Agreement.pdf',
    documentContent
)

// Detect risks
const risks = await detectRisks(
    'NDA Agreement.pdf',
    documentContent
)
```

## Email Intelligence

### Features

1. **Sentiment Analysis**
   - Categories: positive, neutral, risk, blocker
   - Automatic blocker flagging

2. **Blocker Detection**
   - Identifies dependencies and waiting conditions
   - Tracks age of blockers
   - Extracts participants

### Usage

```typescript
import { analyzeEmail, detectBlockerInThread } from '@/lib/ai/email-intelligence'

// Analyze single email
const analysis = await analyzeEmail(
    subject,
    content,
    sender
)

// Analyze thread for blockers
const blockerInfo = await detectBlockerInThread(emailArray)
```

## Database Schema

### Briefs Table

Created in: `supabase/migrations/20250101000002_add_briefs_table.sql`

```sql
create table briefs (
  id uuid primary key,
  deal_id uuid references deals(id),
  brief_date date unique,
  progress_snapshot jsonb,
  changes jsonb,
  blockers jsonb,
  risks jsonb,
  communications jsonb,
  status text default 'draft',
  created_at timestamp,
  published_at timestamp
)
```

JSONB fields allow flexible structure for AI-generated insights.

## Progress Calculation

### Overall Progress
```
progress = (reviewed_docs / total_docs) × 100
```

### Workstream Progress
Calculated per workstream using same formula.

### Change Detection
Compares current progress to previous brief's `progress_snapshot.overall`.

## Blocker Detection

### Email Blockers
- Emails with `is_blocker = true`
- Emails with `sentiment = 'risk'`
- Age calculated from `received_at`

### Stalled Documents
- Status: `new` or `updated`
- No update in 7+ days
- Treated as implicit blockers

## Testing the Backend

### 1. Generate a Brief

```bash
# Start the app
npm run dev

# Generate brief via API
curl -X POST http://localhost:3000/api/briefs/generate \
  -H "Content-Type: application/json" \
  -d '{"dealId": "your-deal-id"}'
```

### 2. Test Document Summarization

Add the `summarizeDocumentWithAI` action to a document page button.

### 3. Test Email Analysis

Use the mock email creation on `/communications` page, then check sentiment detection.

## Future Enhancements

### Background Job Queue
- Set up Redis for job queuing
- Create workers for async processing
- Schedule daily brief generation

### Source Integration
- Google Drive monitoring
- SharePoint synchronization
- Gmail/Outlook email ingestion

### Enhanced AI
- Multi-document comparison
- Trend analysis over time
- Predictive blocker identification

## Environment Variables

Required in `.env.local`:

```bash
# Anthropic AI
ANTHROPIC_API_KEY=sk-ant-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8005
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# App URL (for server actions calling API routes)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Architecture Notes

### Why JSONB for Brief Data?

- **Flexibility**: AI-generated content varies in structure
- **Versioning**: Easy to add fields without migrations
- **Performance**: PostgreSQL JSONB is indexed and fast
- **Citations**: Can store arrays of quotes, links, metadata

### Why Separate API Route?

The `/api/briefs/generate` route allows:
- Background job triggers
- Webhook integrations
- Scheduled cron jobs
- External tool access

### AI Usage Rules (from originplan.md)

✅ AI may:
- Summarize content
- Detect changes
- Suggest risks or blockers

❌ AI may not:
- Make decisions
- Replace human judgment
- Hide uncertainty

All AI outputs must:
- Be labeled as suggestions
- Include citations
- Be reversible by users

## Troubleshooting

### "API key not found"
Add `ANTHROPIC_API_KEY` to `.env.local` and restart dev server.

### "Failed to generate brief"
Check server logs for detailed error. Common issues:
- Missing deal data
- Database connection issues
- AI API rate limits

### Brief generation is slow
- Normal: AI calls take 2-5 seconds
- Optimize: Cache document summaries
- Future: Use background jobs for async generation

## Performance Considerations

- **Brief generation**: ~5-10 seconds with AI
- **Document summarization**: ~2-3 seconds per document
- **Email analysis**: ~1-2 seconds per email
- **Batch processing**: Use background jobs for large datasets

## Security

- API keys stored in environment variables (never committed)
- Server actions validate deal membership (when RLS enabled)
- AI responses sanitized before database storage
- Rate limiting recommended for production
