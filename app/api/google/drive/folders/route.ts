import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getValidAccessToken } from '@/lib/oauth/token-manager'
import { listDriveFolders } from '@/lib/integrations/google/drive-folders'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const parentId = searchParams.get('parentId') || 'root'

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get valid access token (auto-refreshes if needed)
    const accessToken = await getValidAccessToken(user.id, 'google')

    // Fetch folders
    const folders = await listDriveFolders(accessToken, parentId)

    return NextResponse.json({ folders })
  } catch (error: any) {
    console.error('Drive folders API error:', error)

    if (error.message?.includes('No active')) {
      return NextResponse.json(
        { error: 'Google account not connected' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch folders' },
      { status: 500 }
    )
  }
}
