###

 DealPulse Background Workers

Complete guide to the background job processing system.

## Overview

From `originplan.md` Section 4.4:
- **Redis** queue-based workers
- **Separate worker container** from main app
- All heavy work is asynchronous:
  - Document ingestion
  - OCR processing
  - Email parsing
  - Daily brief generation

## Architecture

```
┌─────────────┐      ┌───────┐      ┌──────────────┐
│  Next.js    │─────>│ Redis │<─────│   Workers    │
│  App        │      │ Queue │      │  (Separate   │
│             │      │       │      │  Container)  │
└─────────────┘      └───────┘      └──────────────┘
       │                                     │
       │                                     │
       └──────────────┬──────────────────────┘
                      │
                ┌─────▼─────┐
                │ Supabase  │
                │ Postgres  │
                └───────────┘
```

## Components

### 1. Queue System (`lib/queue/`)

#### `connection.ts`
- Redis connection setup
- Queue definitions (Daily Brief, Documents, Emails, Source Sync)
- Queue events for monitoring

#### `jobs.ts`
- Job interfaces and type definitions
- Functions to add jobs to queues:
  - `queueDailyBrief(dealId, date?)`
  - `queueDocumentProcessing(documentId, dealId, operation)`
  - `queueEmailProcessing(emailId, dealId, operation)`
  - `queueSourceSync(dealId, sourceType, syncType)`
- Queue statistics retrieval

### 2. Worker Processors (`workers/processors/`)

#### `daily-brief.ts`
- Generates daily briefs
- Concurrency: 2
- Retries: 3 with exponential backoff

#### `document-processing.ts`
- Document summarization
- Risk extraction
- Workstream classification
- Concurrency: 5

#### `email-processing.ts`
- Sentiment analysis
- Blocker detection
- Concurrency: 10

#### `source-sync.ts`
- Google Drive sync
- SharePoint sync
- Gmail sync
- Outlook sync
- Concurrency: 3

### 3. Scheduler (`workers/schedulers/`)

#### `daily-brief-cron.ts`
- Cron job for daily brief generation
- Default schedule: 8:00 AM daily
- Configurable via environment variables

### 4. Worker Process (`workers/index.ts`)

Main entry point that:
- Initializes all worker processes
- Starts the daily brief scheduler
- Handles graceful shutdown
- Monitors worker health

## Setup

### 1. Dependencies

Already installed in `package.json`:
```json
{
  "bullmq": "^5.34.0",      // Job queue
  "ioredis": "^5.4.2",      // Redis client
  "node-cron": "^3.0.3",    // Scheduler
  "tsx": "^4.19.2"          // TypeScript execution
}
```

### 2. Environment Variables

Add to `.env.local`:

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Daily Brief Scheduler
DAILY_BRIEF_TIME="0 8 * * *"  # 8:00 AM daily (cron format)
TIMEZONE="America/New_York"

# Supabase (for worker database access)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8005
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI (for document/email processing)
ANTHROPIC_API_KEY=your-api-key
```

### 3. Docker Compose

Redis and worker services are already configured in `compose.yaml`:

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - mna_redis_data:/data

  worker:
    build: .
    command: npm run worker
    depends_on:
      - redis
      - db
    environment:
      REDIS_HOST: redis
      REDIS_PORT: 6379
```

## Running Workers

### Development

**With Docker Compose** (recommended):
```bash
docker compose up worker
```

**Locally** (requires Redis running):
```bash
# Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# Start workers
npm run worker
```

### Production

```bash
# Build
npm run build

# Run worker
npm run worker:prod
```

## Usage

### Queue a Daily Brief

**From Code**:
```typescript
import { queueDailyBrief } from '@/lib/queue/jobs'

await queueDailyBrief('deal-id-123')
```

**Via API**:
```bash
# Trigger for all active deals
curl -X POST http://localhost:3000/api/queue/trigger-daily-briefs
```

### Queue Document Processing

```typescript
import { queueDocumentProcessing } from '@/lib/queue/jobs'

await queueDocumentProcessing(
    'doc-id-456',
    'deal-id-123',
    'summarize'  // or 'extract_risks' or 'classify'
)
```

### Queue Email Processing

```typescript
import { queueEmailProcessing } from '@/lib/queue/jobs'

await queueEmailProcessing(
    'email-id-789',
    'deal-id-123',
    'analyze_sentiment'  // or 'detect_blocker'
)
```

### Queue Source Sync

```typescript
import { queueSourceSync } from '@/lib/queue/jobs'

await queueSourceSync(
    'deal-id-123',
    'gdrive',        // or 'sharepoint', 'gmail', 'outlook'
    'incremental'    // or 'full'
)
```

## Monitoring

### Queue Statistics

**Via API**:
```bash
curl http://localhost:3000/api/queue/stats
```

**Response**:
```json
{
  "success": true,
  "stats": {
    "dailyBrief": {
      "waiting": 0,
      "active": 1,
      "completed": 5,
      "failed": 0
    },
    "documentProcessing": {...},
    "emailProcessing": {...},
    "sourceSync": {...}
  }
}
```

### Worker Logs

Workers log their status every minute:
```
📊 Worker Status:
  Daily Brief: ✅
  Documents: ✅
  Emails: ✅
  Source Sync: ✅
```

### BullMQ Dashboard (Optional)

Install Bull Board for visual monitoring:
```bash
npm install @bull-board/api @bull-board/express
```

## Job Configuration

### Retry Strategy

All queues use exponential backoff:
- **Attempts**: 3-5 (varies by queue)
- **Backoff**: Exponential starting at 5-10 seconds
- **Failed job retention**: Last 500 jobs
- **Completed job retention**: Last 100 jobs

### Concurrency

- **Daily Brief**: 2 concurrent jobs
- **Documents**: 5 concurrent jobs
- **Emails**: 10 concurrent jobs
- **Source Sync**: 3 concurrent jobs

Adjust in `workers/index.ts`:
```typescript
const documentWorker = new Worker(
    QUEUE_NAMES.DOCUMENT_PROCESSING,
    processDocument,
    {
        connection: redisConnection,
        concurrency: 10,  // Increase for more throughput
    }
)
```

## Daily Brief Scheduler

### Default Schedule

Runs daily at 8:00 AM (configurable):

```bash
# In .env.local
DAILY_BRIEF_TIME="0 8 * * *"     # 8:00 AM daily
TIMEZONE="America/New_York"
```

### Cron Format

```
┌──────── minute (0 - 59)
│ ┌────── hour (0 - 23)
│ │ ┌──── day of month (1 - 31)
│ │ │ ┌── month (1 - 12)
│ │ │ │ ┌ day of week (0 - 7)
│ │ │ │ │
* * * * *
```

**Examples**:
- `0 8 * * *` - 8:00 AM daily
- `0 6,18 * * *` - 6:00 AM and 6:00 PM daily
- `0 9 * * 1-5` - 9:00 AM on weekdays
- `*/30 * * * *` - Every 30 minutes

### Manual Trigger

```bash
curl -X POST http://localhost:3000/api/queue/trigger-daily-briefs
```

## Error Handling

### Automatic Retries

Jobs automatically retry with exponential backoff:
1. First retry: 5 seconds
2. Second retry: 25 seconds (5 × 5)
3. Third retry: 125 seconds (25 × 5)

### Failed Jobs

Failed jobs are retained for debugging:
```typescript
// View failed jobs (requires Bull Board or custom admin UI)
const failedJobs = await dailyBriefQueue.getFailed()
```

### Graceful Shutdown

Workers handle SIGTERM and SIGINT:
```typescript
// Completes current jobs before shutting down
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
```

## Performance

### Benchmarks

- **Daily Brief Generation**: ~5-10 seconds
- **Document Summarization**: ~2-3 seconds
- **Email Analysis**: ~1-2 seconds
- **Source Sync**: Varies (60-300 seconds)

### Scaling

**Horizontal Scaling**:
```bash
# Run multiple worker containers
docker compose up --scale worker=3
```

**Vertical Scaling**:
- Increase concurrency per worker
- Allocate more CPU/memory to container

## Debugging

### Enable Verbose Logging

Add to worker environment:
```bash
DEBUG=bullmq:*
NODE_ENV=development
```

### Check Redis Connection

```bash
docker exec -it mna-redis-1 redis-cli ping
# Should return: PONG
```

### View Queue Contents

```bash
# Using redis-cli
docker exec -it mna-redis-1 redis-cli

# List all keys
KEYS *

# Get queue size
LLEN bull:daily-brief:wait
```

## Integration Examples

### From Server Action

```typescript
// app/(authenticated)/actions.ts
export async function processDocumentAsync(documentId: string, dealId: string) {
    await queueDocumentProcessing(documentId, dealId, 'summarize')
    return { success: true, message: 'Document queued for processing' }
}
```

### From API Route

```typescript
// app/api/documents/[id]/process/route.ts
export async function POST(request: Request) {
    const { documentId, dealId } = await request.json()

    await queueDocumentProcessing(documentId, dealId, 'summarize')

    return NextResponse.json({
        success: true,
        message: 'Processing started',
    })
}
```

### From Webhook

```typescript
// app/api/webhooks/gdrive/route.ts
export async function POST(request: Request) {
    const { changes } = await request.json()

    for (const change of changes) {
        await queueSourceSync(change.dealId, 'gdrive', 'incremental')
    }

    return NextResponse.json({ received: true })
}
```

## Best Practices

1. **Use Queues for Heavy Work**
   - AI processing
   - External API calls
   - Large file processing
   - Email generation

2. **Don't Queue Simple Tasks**
   - Database updates
   - Simple calculations
   - User-facing operations

3. **Monitor Queue Depth**
   - Alert if waiting jobs > 100
   - Scale workers if processing is slow

4. **Handle Failures Gracefully**
   - Log errors with context
   - Notify admins for repeated failures
   - Provide fallback behavior

5. **Test Locally First**
   - Use manual triggers for testing
   - Check queue stats frequently
   - Monitor worker logs

## Troubleshooting

### Workers Not Processing Jobs

1. Check Redis connection:
   ```bash
   docker logs mna-redis-1
   ```

2. Check worker logs:
   ```bash
   docker logs mna-worker-1
   ```

3. Verify queue stats:
   ```bash
   curl http://localhost:3000/api/queue/stats
   ```

### Jobs Stuck in "Active"

- Workers may have crashed
- Restart worker container:
  ```bash
  docker compose restart worker
  ```

### High Memory Usage

- Reduce concurrency
- Process smaller batches
- Clear completed jobs more frequently

## Future Enhancements

- [ ] Bull Board UI for visual monitoring
- [ ] Job priority levels
- [ ] Rate limiting per source
- [ ] Job result caching
- [ ] Scheduled reports
- [ ] Dead letter queue handling
- [ ] Performance metrics dashboard
