import { Job } from 'bullmq'
import { DocumentProcessingJobData } from '@/lib/queue/jobs'
import { summarizeDocument, detectRisks, classifyDocument } from '@/lib/ai/document-intelligence'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Document Processing Worker
 *
 * Handles document summarization, risk detection, and classification
 * From originplan.md Section 5.3: Document Awareness
 */

function getSupabase() {
    return createServiceClient()
}

export async function processDocument(job: Job<DocumentProcessingJobData>) {
    const { documentId, dealId, operation } = job.data

    console.log(`🔄 Processing document ${documentId}: ${operation}`)

    try {
        await job.updateProgress(10)

        // Fetch document from database
        const { data: doc, error } = await getSupabase()
            .from('documents')
            .select('*, workstreams(id, name)')
            .eq('id', documentId)
            .single()

        if (error || !doc) {
            throw new Error(`Document ${documentId} not found: ${error?.message}`)
        }

        await job.updateProgress(30)

        let result
        switch (operation) {
            case 'summarize':
                result = await processSummarization(doc)
                break
            case 'extract_risks':
                result = await processRiskExtraction(doc)
                break
            case 'classify':
                result = await processClassification(doc, dealId)
                break
        }

        await job.updateProgress(100)

        console.log(`✅ Document ${operation} completed for ${documentId}`)

        return {
            success: true,
            documentId,
            operation,
            ...result,
        }
    } catch (error) {
        console.error(`❌ Document processing failed for ${documentId}:`, error)
        throw error
    }
}

interface DocumentRecord {
    id: string
    name: string
    source_url?: string
    summary?: string
    workstreams?: { id: string; name: string } | null
}

async function processSummarization(doc: DocumentRecord) {
    console.log(`  📝 Generating summary for document ${doc.id}`)

    // TODO: In production, fetch actual content from source
    // For now, use document name as a placeholder for content
    const contentPlaceholder = `Document: ${doc.name}\n\nThis is a placeholder for document content. In production, content would be fetched from ${doc.source_url || 'the source system'}.`

    const summary = await summarizeDocument(doc.name, contentPlaceholder)

    // Update document with summary
    const { error } = await getSupabase()
        .from('documents')
        .update({
            summary,
            updated_at: new Date().toISOString(),
        })
        .eq('id', doc.id)

    if (error) {
        console.error(`  ❌ Failed to update summary: ${error.message}`)
        throw error
    }

    console.log(`  ✅ Summary saved for ${doc.name}`)
    return { summary }
}

async function processRiskExtraction(doc: DocumentRecord) {
    console.log(`  ⚠️ Extracting risks from document ${doc.id}`)

    // TODO: In production, fetch actual content from source
    const contentPlaceholder = `Document: ${doc.name}\n\nPlaceholder content for risk analysis.`

    const risks = await detectRisks(doc.name, contentPlaceholder)

    // Store risks in a document_risks table if it exists, or in document metadata
    // For now, we'll log and return the risks
    console.log(`  📋 Found ${risks.length} risks in ${doc.name}`)

    return { risks, riskCount: risks.length }
}

async function processClassification(doc: DocumentRecord, dealId: string) {
    console.log(`  🏷️ Classifying document ${doc.id}`)

    // TODO: In production, fetch actual content from source
    const contentPlaceholder = `Document: ${doc.name}\n\nPlaceholder content for classification.`

    const classification = await classifyDocument(doc.name, contentPlaceholder)

    // If already has a workstream, don't overwrite
    if (doc.workstreams) {
        console.log(`  ℹ️ Document already assigned to ${doc.workstreams.name}`)
        return { workstream: doc.workstreams.name, alreadyClassified: true }
    }

    // Find or create workstream for this classification
    const { data: workstream, error: wsError } = await getSupabase()
        .from('workstreams')
        .select('id')
        .eq('deal_id', dealId)
        .eq('name', classification.workstream)
        .single()

    if (wsError && wsError.code !== 'PGRST116') {
        // PGRST116 = no rows found
        console.error(`  ❌ Error finding workstream: ${wsError.message}`)
    }

    if (workstream) {
        // Update document with workstream
        const { error } = await getSupabase()
            .from('documents')
            .update({
                workstream_id: workstream.id,
                updated_at: new Date().toISOString(),
            })
            .eq('id', doc.id)

        if (error) {
            console.error(`  ❌ Failed to update workstream: ${error.message}`)
        } else {
            console.log(`  ✅ Classified as ${classification.workstream} (${classification.confidence}% confidence)`)
        }
    } else {
        console.log(`  ⚠️ Workstream "${classification.workstream}" not found for deal ${dealId}`)
    }

    return {
        workstream: classification.workstream,
        confidence: classification.confidence,
        reasoning: classification.reasoning,
    }
}
