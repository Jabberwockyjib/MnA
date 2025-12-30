import { Job } from 'bullmq'
import { EmailProcessingJobData } from '@/lib/queue/jobs'
import { analyzeEmail, detectBlockerInThread } from '@/lib/ai/email-intelligence'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Email Processing Worker
 *
 * Handles email sentiment analysis and blocker detection
 * From originplan.md Section 5.4: Email Awareness
 */

function getSupabase() {
    return createServiceClient()
}

export async function processEmail(job: Job<EmailProcessingJobData>) {
    const { emailId, dealId, operation } = job.data

    console.log(`🔄 Processing email ${emailId}: ${operation}`)

    try {
        await job.updateProgress(10)

        // Fetch email from database
        const { data: email, error } = await getSupabase()
            .from('emails')
            .select('*')
            .eq('id', emailId)
            .single()

        if (error || !email) {
            throw new Error(`Email ${emailId} not found: ${error?.message}`)
        }

        await job.updateProgress(30)

        let result
        switch (operation) {
            case 'analyze_sentiment':
                result = await processSentimentAnalysis(email)
                break
            case 'detect_blocker':
                result = await processBlockerDetection(email)
                break
        }

        await job.updateProgress(100)

        console.log(`✅ Email ${operation} completed for ${emailId}`)

        return {
            success: true,
            emailId,
            operation,
            ...result,
        }
    } catch (error) {
        console.error(`❌ Email processing failed for ${emailId}:`, error)
        throw error
    }
}

interface EmailRecord {
    id: string
    thread_id?: string
    subject?: string
    sender?: string
    snippet?: string
    sentiment?: string
    is_blocker?: boolean
    received_at?: string
    deal_id: string
}

async function processSentimentAnalysis(email: EmailRecord) {
    console.log(`  😊 Analyzing sentiment for email ${email.id}`)

    const analysis = await analyzeEmail(
        email.subject || '',
        email.snippet || '',
        email.sender || ''
    )

    // Update email with sentiment analysis
    const { error } = await getSupabase()
        .from('emails')
        .update({
            sentiment: analysis.sentiment,
            is_blocker: analysis.isBlocker,
        })
        .eq('id', email.id)

    if (error) {
        console.error(`  ❌ Failed to update sentiment: ${error.message}`)
        throw error
    }

    console.log(`  ✅ Sentiment: ${analysis.sentiment}, Blocker: ${analysis.isBlocker}`)

    return {
        sentiment: analysis.sentiment,
        isBlocker: analysis.isBlocker,
        keyPoints: analysis.keyPoints,
    }
}

async function processBlockerDetection(email: EmailRecord) {
    console.log(`  🚫 Detecting blockers in email ${email.id}`)

    if (!email.thread_id) {
        // No thread, analyze single email
        const analysis = await analyzeEmail(
            email.subject || '',
            email.snippet || '',
            email.sender || ''
        )

        // Update email
        const { error } = await getSupabase()
            .from('emails')
            .update({
                is_blocker: analysis.isBlocker,
                sentiment: analysis.isBlocker ? 'blocker' : analysis.sentiment,
            })
            .eq('id', email.id)

        if (error) {
            console.error(`  ❌ Failed to update blocker status: ${error.message}`)
        }

        return {
            isBlocker: analysis.isBlocker,
            blockerReason: analysis.blockerReason,
        }
    }

    // Fetch thread emails
    const { data: threadEmails, error: threadError } = await getSupabase()
        .from('emails')
        .select('*')
        .eq('thread_id', email.thread_id)
        .order('received_at', { ascending: true })

    if (threadError || !threadEmails?.length) {
        console.log(`  ⚠️ Could not fetch thread emails: ${threadError?.message}`)
        return { isBlocker: false }
    }

    // Analyze thread for blockers
    const threadData = threadEmails.map(e => ({
        subject: e.subject || '',
        sender: e.sender || '',
        snippet: e.snippet || '',
        date: e.received_at || '',
    }))

    const blockerInfo = await detectBlockerInThread(threadData)

    // Update the original email with blocker info
    if (blockerInfo.hasBlocker) {
        const { error } = await getSupabase()
            .from('emails')
            .update({
                is_blocker: true,
                sentiment: 'blocker',
            })
            .eq('id', email.id)

        if (error) {
            console.error(`  ❌ Failed to update blocker status: ${error.message}`)
        }

        console.log(`  🚨 Blocker detected: ${blockerInfo.blockerTitle}`)
    } else {
        console.log(`  ✅ No blocker detected in thread`)
    }

    return {
        isBlocker: blockerInfo.hasBlocker,
        blockerTitle: blockerInfo.blockerTitle,
        ageInDays: blockerInfo.ageInDays,
        workstream: blockerInfo.workstream,
        participants: blockerInfo.participants,
    }
}
