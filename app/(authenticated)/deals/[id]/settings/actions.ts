'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveDriveSource(
  dealId: string,
  folderId: string,
  folderPath: string
) {
  // Validate inputs
  if (!dealId?.trim()) {
    throw new Error('Deal ID is required')
  }
  if (!folderId?.trim()) {
    throw new Error('Folder ID is required')
  }
  if (!folderPath?.trim()) {
    throw new Error('Folder path is required')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Get user's Google OAuth connection
  const { data: oauthConn } = await supabase
    .from('user_oauth_connections')
    .select('id')
    .eq('user_id', user.id)
    .eq('provider', 'google')
    .eq('is_active', true)
    .single()

  if (!oauthConn) {
    throw new Error('No active Google connection')
  }

  // Upsert source connection
  const { error } = await supabase
    .from('source_connections')
    .upsert({
      deal_id: dealId,
      source_type: 'gdrive',
      user_oauth_connection_id: oauthConn.id,
      folder_id: folderId,
      configuration: {
        folderId,
        folderPath,
      },
      is_active: true,
    }, {
      onConflict: 'deal_id,source_type'
    })

  if (error) {
    console.error('Save Drive source error:', error)
    throw new Error('Failed to save Drive source')
  }

  revalidatePath(`/deals/${dealId}/settings`)
  return { success: true }
}

export async function removeDriveSource(dealId: string) {
  // Validate inputs
  if (!dealId?.trim()) {
    throw new Error('Deal ID is required')
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('source_connections')
    .delete()
    .eq('deal_id', dealId)
    .eq('source_type', 'gdrive')

  if (error) {
    throw new Error('Failed to remove Drive source')
  }

  revalidatePath(`/deals/${dealId}/settings`)
  return { success: true }
}

export async function saveGmailSource(
  dealId: string,
  labelIds: string[],
  labelNames: string[]
) {
  // Validate inputs
  if (!dealId?.trim()) {
    throw new Error('Deal ID is required')
  }
  if (!Array.isArray(labelIds) || labelIds.length === 0) {
    throw new Error('Label IDs are required')
  }
  if (!Array.isArray(labelNames) || labelNames.length === 0) {
    throw new Error('Label names are required')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data: oauthConn } = await supabase
    .from('user_oauth_connections')
    .select('id')
    .eq('user_id', user.id)
    .eq('provider', 'google')
    .eq('is_active', true)
    .single()

  if (!oauthConn) {
    throw new Error('No active Google connection')
  }

  const { error } = await supabase
    .from('source_connections')
    .upsert({
      deal_id: dealId,
      source_type: 'gmail',
      user_oauth_connection_id: oauthConn.id,
      configuration: {
        labelIds,
        labelNames,
      },
      is_active: true,
    }, {
      onConflict: 'deal_id,source_type'
    })

  if (error) {
    console.error('Save Gmail source error:', error)
    throw new Error('Failed to save Gmail source')
  }

  revalidatePath(`/deals/${dealId}/settings`)
  return { success: true }
}

export async function removeGmailSource(dealId: string) {
  // Validate inputs
  if (!dealId?.trim()) {
    throw new Error('Deal ID is required')
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('source_connections')
    .delete()
    .eq('deal_id', dealId)
    .eq('source_type', 'gmail')

  if (error) {
    throw new Error('Failed to remove Gmail source')
  }

  revalidatePath(`/deals/${dealId}/settings`)
  return { success: true }
}
