import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getValidAccessToken } from '@/lib/oauth/token-manager'
import { listGmailLabels } from '@/lib/integrations/google/gmail-labels'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const accessToken = await getValidAccessToken(user.id, 'google')
    const labels = await listGmailLabels(accessToken)

    return NextResponse.json({ labels })
  } catch (error: any) {
    console.error('Gmail labels API error:', error)

    if (error.message?.includes('No active')) {
      return NextResponse.json(
        { error: 'Google account not connected' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch labels' },
      { status: 500 }
    )
  }
}
