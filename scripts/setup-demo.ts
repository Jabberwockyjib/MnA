/**
 * Demo Data Setup Script
 *
 * Creates a realistic demo scenario for showcasing DealPulse.
 * Run with: npx tsx scripts/setup-demo.ts
 *
 * Scenario: "Nexus Technologies Acquisition"
 * - Mid-market software company acquisition
 * - Multiple workstreams with active documents
 * - Mix of blockers, risks, and positive progress
 */

import { config } from 'dotenv'
config({ path: '.env' })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY!
)

// Demo user ID - will be fetched from existing user
let demoUserId: string

async function main() {
    console.log('🎬 Setting up DealPulse Demo Environment...\n')

    // Get existing user
    const { data: users } = await supabase.from('profiles').select('id').limit(1)
    if (!users?.[0]) {
        console.error('❌ No user found. Please log in first.')
        process.exit(1)
    }
    demoUserId = users[0].id
    console.log(`👤 Using user: ${demoUserId}\n`)

    // Clean up existing demo data
    await cleanupDemo()

    // Create demo deal
    const deal = await createDemoDeal()
    console.log(`✅ Created deal: ${deal.name} (${deal.id})\n`)

    // Create workstreams
    const workstreams = await createWorkstreams(deal.id)
    console.log(`✅ Created ${workstreams.length} workstreams\n`)

    // Add demo documents
    await createDemoDocuments(deal.id, workstreams)
    console.log(`✅ Added demo documents\n`)

    // Add demo emails
    await createDemoEmails(deal.id)
    console.log(`✅ Added demo emails\n`)

    console.log('🎉 Demo setup complete!')
    console.log(`\n📍 Visit: http://localhost:3011/dashboard`)
    console.log(`\n💡 Demo Scenario: "Nexus Technologies Acquisition"`)
    console.log(`   - $45M acquisition of enterprise SaaS company`)
    console.log(`   - Due diligence in progress across 5 workstreams`)
    console.log(`   - Key blocker: IP assignment agreements pending`)
    console.log(`   - Risk: Customer concentration concerns`)

    process.exit(0)
}

async function cleanupDemo() {
    console.log('🧹 Cleaning up previous demo data...')

    // Delete demo deal if exists
    const { data: existingDeals } = await supabase
        .from('deals')
        .select('id')
        .eq('name', 'Nexus Technologies Acquisition')

    if (existingDeals?.length) {
        for (const deal of existingDeals) {
            await supabase.from('deals').delete().eq('id', deal.id)
        }
        console.log('   Removed existing demo deal')
    }
}

async function createDemoDeal() {
    const { data, error } = await supabase
        .from('deals')
        .insert({
            name: 'Nexus Technologies Acquisition',
            status: 'active',
        })
        .select()
        .single()

    if (error) throw error

    // Add user as admin
    await supabase.from('deal_members').insert({
        deal_id: data.id,
        user_id: demoUserId,
        role: 'admin',
    })

    return data
}

async function createWorkstreams(dealId: string) {
    const workstreamData = [
        { name: 'Legal', description: 'Contract review, IP, regulatory compliance' },
        { name: 'Finance', description: 'Financial due diligence, valuation, tax' },
        { name: 'HR', description: 'Employee matters, benefits, retention' },
        { name: 'IT', description: 'Technology stack, security, integration' },
        { name: 'Ops', description: 'Operations, facilities, supply chain' },
    ]

    const { data, error } = await supabase
        .from('workstreams')
        .insert(workstreamData.map(ws => ({ ...ws, deal_id: dealId })))
        .select()

    if (error) throw error
    return data
}

async function createDemoDocuments(dealId: string, workstreams: any[]) {
    const wsMap = Object.fromEntries(workstreams.map(ws => [ws.name, ws.id]))

    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const documents = [
        // Legal - Mix of statuses
        {
            name: 'Master Services Agreement - Nexus v2.3.pdf',
            workstream_id: wsMap['Legal'],
            source_type: 'gdrive',
            status: 'reviewed',
            summary: 'Standard MSA with 3-year term. Contains standard indemnification clauses. No unusual liability caps.',
            created_at: weekAgo.toISOString(),
        },
        {
            name: 'IP Assignment Agreements - PENDING.pdf',
            workstream_id: wsMap['Legal'],
            source_type: 'gdrive',
            status: 'new',
            summary: 'Critical: 3 founding engineers have not signed IP assignment. Blocker for closing.',
            created_at: yesterday.toISOString(),
        },
        {
            name: 'Patent Portfolio Summary.xlsx',
            workstream_id: wsMap['Legal'],
            source_type: 'gdrive',
            status: 'reviewed',
            summary: '12 patents, 4 pending applications. Core ML patents expire 2031. No litigation history.',
            created_at: weekAgo.toISOString(),
        },
        {
            name: 'Customer Contract Analysis.pdf',
            workstream_id: wsMap['Legal'],
            source_type: 'gdrive',
            status: 'new',
            summary: 'Review of top 20 customer contracts. 2 contain change-of-control provisions requiring consent.',
            created_at: now.toISOString(),
        },

        // Finance
        {
            name: 'Q3 2024 Financial Statements - Audited.pdf',
            workstream_id: wsMap['Finance'],
            source_type: 'gdrive',
            status: 'reviewed',
            summary: 'Clean audit opinion. Revenue $12.3M, EBITDA $2.1M. YoY growth 34%.',
            created_at: weekAgo.toISOString(),
        },
        {
            name: 'Revenue Recognition Analysis.xlsx',
            workstream_id: wsMap['Finance'],
            source_type: 'gdrive',
            status: 'reviewed',
            summary: 'ASC 606 compliant. 89% recurring revenue. Average contract value $45K.',
            created_at: twoDaysAgo.toISOString(),
        },
        {
            name: 'Customer Concentration Report.pdf',
            workstream_id: wsMap['Finance'],
            source_type: 'gdrive',
            status: 'new',
            summary: 'RISK: Top 3 customers = 42% of revenue. Largest customer (TechCorp) = 18%.',
            created_at: yesterday.toISOString(),
        },
        {
            name: 'Working Capital Analysis.xlsx',
            workstream_id: wsMap['Finance'],
            source_type: 'gdrive',
            status: 'updated',
            summary: 'Net working capital $3.2M. AR aging healthy, 95% current. No unusual payables.',
            created_at: now.toISOString(),
        },

        // HR
        {
            name: 'Employee Census and Compensation.xlsx',
            workstream_id: wsMap['HR'],
            source_type: 'gdrive',
            status: 'reviewed',
            summary: '127 employees. Engineering 62%, Sales 18%, G&A 20%. Median tenure 2.3 years.',
            created_at: weekAgo.toISOString(),
        },
        {
            name: 'Key Employee Retention Agreements.pdf',
            workstream_id: wsMap['HR'],
            source_type: 'gdrive',
            status: 'new',
            summary: 'Retention packages proposed for 8 key employees. Total cost $1.2M over 2 years.',
            created_at: yesterday.toISOString(),
        },
        {
            name: 'Benefits Summary and Costs.pdf',
            workstream_id: wsMap['HR'],
            source_type: 'gdrive',
            status: 'reviewed',
            summary: 'Standard benefits package. Healthcare costs $890K annually. 401k match 4%.',
            created_at: twoDaysAgo.toISOString(),
        },

        // IT
        {
            name: 'Technology Stack Assessment.pdf',
            workstream_id: wsMap['IT'],
            source_type: 'gdrive',
            status: 'reviewed',
            summary: 'Modern stack: AWS, Kubernetes, React/Node. Technical debt estimated at 3 months.',
            created_at: weekAgo.toISOString(),
        },
        {
            name: 'Security Audit Report - 2024.pdf',
            workstream_id: wsMap['IT'],
            source_type: 'gdrive',
            status: 'reviewed',
            summary: 'SOC 2 Type II certified. No critical findings. 2 medium issues remediated.',
            created_at: twoDaysAgo.toISOString(),
        },
        {
            name: 'Integration Requirements.docx',
            workstream_id: wsMap['IT'],
            source_type: 'gdrive',
            status: 'new',
            summary: 'API integration plan for post-close. Estimated 6-8 weeks for core systems.',
            created_at: now.toISOString(),
        },

        // Ops
        {
            name: 'Vendor Contract Summary.xlsx',
            workstream_id: wsMap['Ops'],
            source_type: 'gdrive',
            status: 'reviewed',
            summary: '34 active vendor contracts. AWS largest at $180K/year. No problematic terms.',
            created_at: weekAgo.toISOString(),
        },
        {
            name: 'Office Lease Agreement - SF.pdf',
            workstream_id: wsMap['Ops'],
            source_type: 'gdrive',
            status: 'reviewed',
            summary: 'Lease expires Dec 2026. 15,000 sq ft @ $65/sq ft. Sublease permitted with consent.',
            created_at: twoDaysAgo.toISOString(),
        },
    ]

    const { error } = await supabase
        .from('documents')
        .insert(documents.map(doc => ({ ...doc, deal_id: dealId })))

    if (error) throw error
    console.log(`   Added ${documents.length} documents across workstreams`)
}

async function createDemoEmails(dealId: string) {
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

    const emails = [
        // Blocker email
        {
            subject: 'RE: IP Assignment - Urgent Follow-up Needed',
            sender: 'sarah.chen@nexustech.io',
            snippet: 'We still have not received signed IP assignments from 3 engineers. This is blocking our ability to close. Can we schedule a call to discuss resolution?',
            thread_id: 'thread-ip-001',
            sentiment: 'blocker',
            is_blocker: true,
            received_at: yesterday.toISOString(),
            status: 'new',
        },
        // Risk email
        {
            subject: 'Customer Concentration Concerns',
            sender: 'mike.johnson@acquirer.com',
            snippet: 'The 42% concentration in top 3 customers is concerning. We should discuss mitigation strategies and potentially adjust valuation.',
            thread_id: 'thread-risk-001',
            sentiment: 'risk',
            is_blocker: false,
            received_at: yesterday.toISOString(),
            status: 'new',
        },
        // Positive progress
        {
            subject: 'SOC 2 Audit Complete - All Clear',
            sender: 'david.kim@nexustech.io',
            snippet: 'Great news! Our SOC 2 Type II audit is complete with no critical findings. Report attached for your review.',
            thread_id: 'thread-soc2-001',
            sentiment: 'positive',
            is_blocker: false,
            received_at: twoDaysAgo.toISOString(),
            status: 'new',
        },
        // Neutral update
        {
            subject: 'Weekly Due Diligence Status Update',
            sender: 'jennifer.wu@acquirer.com',
            snippet: 'Attached is our weekly status update. Legal review 75% complete, Finance 80%, HR 60%, IT 90%, Ops 70%.',
            thread_id: 'thread-status-001',
            sentiment: 'neutral',
            is_blocker: false,
            received_at: twoDaysAgo.toISOString(),
            status: 'new',
        },
        // Another blocker
        {
            subject: 'Change of Control Consent Required',
            sender: 'legal@techcorp.com',
            snippet: 'Per Section 12.3 of our MSA, we require 30 days notice and written consent for any change of control. Please submit formal request.',
            thread_id: 'thread-coc-001',
            sentiment: 'blocker',
            is_blocker: true,
            received_at: threeDaysAgo.toISOString(),
            status: 'new',
        },
        // Positive
        {
            subject: 'RE: Key Employee Retention - Approved',
            sender: 'cfo@acquirer.com',
            snippet: 'The retention packages for the 8 key employees have been approved. Please proceed with offer letters.',
            thread_id: 'thread-retention-001',
            sentiment: 'positive',
            is_blocker: false,
            received_at: yesterday.toISOString(),
            status: 'new',
        },
        // Risk
        {
            subject: 'FW: Competitor Activity Alert',
            sender: 'bd@acquirer.com',
            snippet: 'FYI - heard through channels that Competitor X may also be looking at Nexus. We should consider accelerating timeline.',
            thread_id: 'thread-competitor-001',
            sentiment: 'risk',
            is_blocker: false,
            received_at: now.toISOString(),
            status: 'new',
        },
    ]

    const { error } = await supabase
        .from('emails')
        .insert(emails.map(email => ({ ...email, deal_id: dealId })))

    if (error) throw error
    console.log(`   Added ${emails.length} demo emails with varied sentiments`)
}

main().catch(console.error)
