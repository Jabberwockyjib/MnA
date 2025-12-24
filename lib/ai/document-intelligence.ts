import { generateCompletion } from './client'

/**
 * Generate a concise summary of a document
 * This will be used for document awareness (originplan.md 5.3)
 */
export async function summarizeDocument(
    documentName: string,
    documentContent: string
): Promise<string> {
    const systemPrompt = `You are an expert M&A analyst. Your job is to summarize documents for deal teams.
Focus on: key terms, obligations, risks, deadlines, and critical decision points.
Keep summaries executive-ready: 2-3 sentences maximum.`

    const prompt = `Summarize this M&A document:

Document: ${documentName}
Content: ${documentContent.substring(0, 8000)}

Provide a concise summary highlighting the most important information for deal leads.`

    return await generateCompletion(prompt, {
        systemPrompt,
        maxTokens: 500,
        temperature: 0.5,
    })
}

/**
 * Detect risks and issues in document content
 * Returns highlighted clauses with severity classification
 */
export async function detectRisks(
    documentName: string,
    documentContent: string
): Promise<Array<{
    title: string
    severity: 'low' | 'medium' | 'high'
    citation: string
    explanation: string
}>> {
    const systemPrompt = `You are a risk detection AI for M&A deals.
Identify potential risks, red flags, and exceptional clauses.
Focus on: financial liabilities, legal constraints, compliance issues, and deal-breakers.`

    const prompt = `Analyze this M&A document for risks:

Document: ${documentName}
Content: ${documentContent.substring(0, 8000)}

Identify up to 5 most significant risks. For each risk, provide:
- title: Brief description
- severity: low, medium, or high
- citation: Direct quote from document
- explanation: Why this is a risk

Return as JSON array.`

    try {
        const response = await generateCompletion(prompt, {
            systemPrompt,
            maxTokens: 2000,
            temperature: 0.3,
        })

        // Extract JSON from response
        const jsonMatch = response.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0])
        }

        return []
    } catch (error) {
        console.error('Risk detection error:', error)
        return []
    }
}

/**
 * Classify document by workstream
 * Returns suggested workstream (Legal, HR, Finance, IT, Ops)
 */
export async function classifyDocument(
    documentName: string,
    documentContent: string
): Promise<{
    workstream: string
    confidence: number
    reasoning: string
}> {
    const systemPrompt = `You are a document classifier for M&A deals.
Classify documents into workstreams: Legal, HR, Finance, IT, Ops.
Base your decision on document content and name.`

    const prompt = `Classify this document:

Document: ${documentName}
Content Preview: ${documentContent.substring(0, 2000)}

Return JSON with:
- workstream: One of [Legal, HR, Finance, IT, Ops]
- confidence: 0-100
- reasoning: Brief explanation

JSON only.`

    try {
        const response = await generateCompletion(prompt, {
            systemPrompt,
            maxTokens: 200,
            temperature: 0.2,
        })

        const jsonMatch = response.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0])
        }

        return {
            workstream: 'Ops',
            confidence: 0,
            reasoning: 'Classification failed',
        }
    } catch (error) {
        console.error('Classification error:', error)
        return {
            workstream: 'Ops',
            confidence: 0,
            reasoning: 'Classification failed',
        }
    }
}
