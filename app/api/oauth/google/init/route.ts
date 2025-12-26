import { NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/oauth/google-oauth'

export async function POST() {
  try {
    const url = getAuthUrl()
    return NextResponse.json({ url })
  } catch (error) {
    console.error('OAuth init error:', error)
    return NextResponse.json(
      { error: 'Failed to generate OAuth URL' },
      { status: 500 }
    )
  }
}
