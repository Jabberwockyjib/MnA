'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
}

const DEFAULT_WORKSTREAMS = ['Legal', 'HR', 'Finance', 'IT', 'Ops']

export async function createDeal(firstName: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { redirect('/login') }

    // 1. Create Deal
    const { data: deal, error: dealError } = await supabase
        .from('deals')
        .insert({
            name: `Deal ${firstName}`, // Temporary name, usually user input
            status: 'active'
        })
        .select()
        .single()

    if (dealError) {
        console.error('Error creating deal:', dealError)
        throw new Error('Failed to create deal')
    }

    // 2. Add creator as Admin
    const { error: memberError } = await supabase
        .from('deal_members')
        .insert({
            deal_id: deal.id,
            user_id: user.id,
            role: 'admin'
        })

    if (memberError) {
        console.error('Error adding member:', memberError)
        // Cleanup deal? For now, just throw
        throw new Error('Failed to add member to deal')
    }

    // 3. Create Default Workstreams
    const workstreamsToInsert = DEFAULT_WORKSTREAMS.map(name => ({
        deal_id: deal.id,
        name,
        status: 'active'
    }))

    const { error: workstreamError } = await supabase
        .from('workstreams')
        .insert(workstreamsToInsert)

    if (workstreamError) {
        console.error('Error creating workstreams:', workstreamError)
    }

    revalidatePath('/dashboard')
    return deal.id
}

export async function createDealFromInput(formData: FormData) {
    const name = formData.get('name') as string

    if (!name) {
        return { error: "Name is required" }
    }

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: "Not authenticated" }
    }

    // 1. Create Deal
    const { data: deal, error: dealError } = await supabase
        .from('deals')
        .insert({
            name: name,
            status: 'active'
        })
        .select()
        .single()

    if (dealError) {
        console.error('Error creating deal:', dealError)
        return { error: 'Failed to create deal' }
    }

    // 2. Add creator as Admin
    const { error: memberError } = await supabase
        .from('deal_members')
        .insert({
            deal_id: deal.id,
            user_id: user.id,
            role: 'admin'
        })

    if (memberError) {
        console.error('Error adding member:', memberError)
        return { error: 'Failed to add member' }
    }

    // 3. Create Default Workstreams
    const workstreamsToInsert = DEFAULT_WORKSTREAMS.map(wsName => ({
        deal_id: deal.id,
        name: wsName,
        status: 'active'
    }))

    const { error: workstreamError } = await supabase
        .from('workstreams')
        .insert(workstreamsToInsert)

    if (workstreamError) {
        console.error('Error creating workstreams:', workstreamError)
    }

    revalidatePath('/dashboard')
    // No redirect technically needed if we just show the state update, but refreshing logic might handle it
    return { success: true, dealId: deal.id }
}

export async function getDeals() {
    const supabase = await createClient()
    const { data: deals } = await supabase
        .from('deals')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
    return deals || []
}

export async function getDeal(id: string) {
    const supabase = await createClient()
    const { data: deal } = await supabase
        .from('deals')
        .select('*')
        .eq('id', id)
        .single()
    return deal
}

export async function getWorkstreams(dealId: string) {
    const supabase = await createClient()
    const { data: workstreams } = await supabase
        .from('workstreams')
        .select('*')
        .eq('deal_id', dealId)
        .order('name', { ascending: true })
    return workstreams || []
}

export async function getWorkstream(id: string) {
    const supabase = await createClient()
    const { data: workstream } = await supabase
        .from('workstreams')
        .select(`
            *,
            deals (*)
        `)
        .eq('id', id)
        .single()
    return workstream
}

export async function getDocuments(workstreamId: string) {
    const supabase = await createClient()
    const { data: documents } = await supabase
        .from('documents')
        .select('*')
        .eq('workstream_id', workstreamId)
        .order('created_at', { ascending: false })
    return documents || []
}

export async function addDocument(workstreamId: string, dealId: string, name: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('documents')
        .insert({
            workstream_id: workstreamId,
            deal_id: dealId,
            name: name,
            source_type: 'manual',
            status: 'new'
        })
        .select()
        .single()

    if (error) {
        console.error('Error adding document:', error)
        return { error: 'Failed to add document' }
    }

    revalidatePath(`/deals/${dealId}/workstreams/${workstreamId}`)
    return { success: true, document: data }
}

export async function getAllDocumentsForDeal(dealId: string) {
    const supabase = await createClient()
    const { data: documents } = await supabase
        .from('documents')
        .select(`
            *,
            workstreams (
                id,
                name
            )
        `)
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false })
    return documents || []
}

export async function getDocument(documentId: string) {
    const supabase = await createClient()
    const { data: document } = await supabase
        .from('documents')
        .select(`
            *,
            workstreams (
                id,
                name
            ),
            deals (
                id,
                name
            )
        `)
        .eq('id', documentId)
        .single()
    return document
}

export async function updateDocumentStatus(documentId: string, status: string, dealId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('documents')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', documentId)

    if (error) {
        console.error('Error updating document status:', error)
        return { error: 'Failed to update document status' }
    }

    revalidatePath(`/documents/${documentId}`)
    revalidatePath('/documents')
    revalidatePath(`/deals/${dealId}`)
    return { success: true }
}

export async function getEmailsForDeal(dealId: string) {
    const supabase = await createClient()
    const { data: emails } = await supabase
        .from('emails')
        .select('*')
        .eq('deal_id', dealId)
        .order('received_at', { ascending: false })
    return emails || []
}

export async function addMockEmail(dealId: string, subject: string, sender: string, snippet: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('emails')
        .insert({
            deal_id: dealId,
            subject,
            sender,
            snippet,
            sentiment: 'neutral',
            is_blocker: false,
            status: 'new',
            received_at: new Date().toISOString(),
            thread_id: `thread_${Date.now()}`
        })
        .select()
        .single()

    if (error) {
        console.error('Error adding email:', error)
        return { error: 'Failed to add email' }
    }

    revalidatePath('/communications')
    return { success: true, email: data }
}

export async function getDealMembers(dealId: string) {
    const supabase = await createClient()
    const { data: members } = await supabase
        .from('deal_members')
        .select(`
            *,
            profiles (
                id,
                email,
                full_name,
                avatar_url
            )
        `)
        .eq('deal_id', dealId)
        .order('created_at', { ascending: true })
    return members || []
}

export async function updateMemberRole(memberId: string, role: string, dealId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('deal_members')
        .update({ role })
        .eq('id', memberId)

    if (error) {
        console.error('Error updating member role:', error)
        return { error: 'Failed to update member role' }
    }

    revalidatePath('/team')
    revalidatePath(`/deals/${dealId}`)
    return { success: true }
}

export async function removeDealMember(memberId: string, dealId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('deal_members')
        .delete()
        .eq('id', memberId)

    if (error) {
        console.error('Error removing member:', error)
        return { error: 'Failed to remove member' }
    }

    revalidatePath('/team')
    revalidatePath(`/deals/${dealId}`)
    return { success: true }
}

export async function getBriefsForDeal(dealId: string) {
    const supabase = await createClient()
    const { data: briefs } = await supabase
        .from('briefs')
        .select('*')
        .eq('deal_id', dealId)
        .order('brief_date', { ascending: false })
    return briefs || []
}

export async function getBrief(briefId: string) {
    const supabase = await createClient()
    const { data: brief } = await supabase
        .from('briefs')
        .select(`
            *,
            deals (
                id,
                name
            )
        `)
        .eq('id', briefId)
        .single()
    return brief
}

export async function createMockBrief(dealId: string) {
    const supabase = await createClient()

    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
        .from('briefs')
        .insert({
            deal_id: dealId,
            brief_date: today,
            progress_snapshot: {
                overall: 65,
                workstreams: {
                    Legal: 80,
                    HR: 60,
                    Finance: 70,
                    IT: 50,
                    Ops: 55
                }
            },
            changes: {
                new_documents: ['NDA Final Draft.pdf', 'Employee List Q4.xlsx'],
                updated_documents: ['Integration Plan v2.docx']
            },
            blockers: {
                items: [
                    {
                        title: 'IP Transfer Agreement pending',
                        workstream: 'Legal',
                        age_days: 5
                    }
                ]
            },
            risks: {
                items: [
                    {
                        title: 'Pension liability exceeds estimate',
                        severity: 'high',
                        source: 'HR Due Diligence Report.pdf'
                    }
                ]
            },
            communications: {
                notable: [
                    {
                        subject: 'RE: Final walkthrough schedule',
                        sender: 'facilities@target.com',
                        snippet: 'Confirmed for next Tuesday'
                    }
                ]
            },
            status: 'published',
            published_at: new Date().toISOString()
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating brief:', error)
        return { error: 'Failed to create brief' }
    }

    revalidatePath('/briefs')
    return { success: true, brief: data }
}

export async function generateAIBrief(dealId: string) {
    try {
        // Call the API route to generate brief
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/briefs/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ dealId }),
        })

        if (!response.ok) {
            throw new Error('Failed to generate brief')
        }

        const result = await response.json()

        revalidatePath('/briefs')
        return { success: true, brief: result.brief }
    } catch (error) {
        console.error('AI brief generation error:', error)
        return { error: 'Failed to generate AI brief' }
    }
}

export async function summarizeDocumentWithAI(documentId: string) {
    const supabase = await createClient()

    try {
        // Get document
        const { data: doc } = await supabase
            .from('documents')
            .select('*')
            .eq('id', documentId)
            .single()

        if (!doc) {
            return { error: 'Document not found' }
        }

        // In a real implementation, you would:
        // 1. Fetch actual document content from source (Drive/SharePoint)
        // 2. Use summarizeDocument() from lib/ai/document-intelligence
        // 3. Update the document with the summary

        // For now, create a placeholder summary
        const mockSummary = `AI-generated summary for ${doc.name}. This document contains important information relevant to the deal. Key points include terms, obligations, and timeline requirements that should be reviewed by the deal team.`

        const { error } = await supabase
            .from('documents')
            .update({ summary: mockSummary })
            .eq('id', documentId)

        if (error) {
            return { error: 'Failed to save summary' }
        }

        revalidatePath(`/documents/${documentId}`)
        return { success: true, summary: mockSummary }
    } catch (error) {
        console.error('Summarization error:', error)
        return { error: 'Failed to summarize document' }
    }
}

