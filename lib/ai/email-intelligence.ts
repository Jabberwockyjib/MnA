import { generateStructuredResponse } from './client'

/**
 * Analyze email sentiment and detect blockers
 * Used for email awareness (originplan.md 5.4)
 */
export async function analyzeEmail(
    subject: string,
    content: string,
    sender: string
): Promise<{
    sentiment: 'positive' | 'neutral' | 'risk' | 'blocker'
    isBlocker: boolean
    blockerReason?: string
    keyPoints: string[]
}> {
    const systemPrompt = `You are an email analyzer for M&A deals.
Detect: blockers, waiting conditions, review requests, risks, and positive progress.

Sentiment categories:
- positive: Progress, approvals, confirmations
- neutral: General updates, information sharing
- risk: Concerns, delays, issues
- blocker: Explicit blockers, dependencies, waiting for action

A blocker is something preventing deal progress that requires action.`

    const prompt = `Analyze this email:

Subject: ${subject}
From: ${sender}
Content: ${content.substring(0, 2000)}

Return JSON with:
{
  "sentiment": "positive" | "neutral" | "risk" | "blocker",
  "isBlocker": boolean,
  "blockerReason": "explanation if blocker",
  "keyPoints": ["point 1", "point 2", "point 3"]
}`

    try {
        return await generateStructuredResponse(prompt, {
            systemPrompt,
            maxTokens: 500,
        })
    } catch (error) {
        console.error('Email analysis error:', error)
        return {
            sentiment: 'neutral',
            isBlocker: false,
            keyPoints: [],
        }
    }
}

/**
 * Detect if email thread indicates a blocker
 * Returns blocker details if found
 */
export async function detectBlockerInThread(
    emails: Array<{
        subject: string
        sender: string
        snippet: string
        date: string
    }>
): Promise<{
    hasBlocker: boolean
    blockerTitle?: string
    ageInDays?: number
    workstream?: string
    participants?: string[]
}> {
    const systemPrompt = `You are a blocker detection AI for M&A deals.
Identify explicit blockers: waiting for approval, pending documents, delayed reviews, etc.`

    const emailThread = emails
        .map(
            (e, i) => `
Email ${i + 1}:
Date: ${e.date}
From: ${e.sender}
Subject: ${e.subject}
Snippet: ${e.snippet}
`
        )
        .join('\n---\n')

    const prompt = `Analyze this email thread for blockers:

${emailThread}

Return JSON with:
{
  "hasBlocker": boolean,
  "blockerTitle": "brief description if blocker exists",
  "ageInDays": estimated days since blocker started,
  "workstream": "Legal" | "HR" | "Finance" | "IT" | "Ops" | null,
  "participants": ["email addresses involved"]
}`

    try {
        return await generateStructuredResponse(prompt, {
            systemPrompt,
            maxTokens: 300,
        })
    } catch (error) {
        console.error('Blocker detection error:', error)
        return {
            hasBlocker: false,
        }
    }
}
