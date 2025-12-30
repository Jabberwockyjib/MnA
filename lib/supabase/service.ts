import { createClient } from '@supabase/supabase-js'

/**
 * Service Role Supabase Client
 *
 * For use in background workers and server-side operations
 * that don't have access to user cookies/sessions.
 *
 * Uses the service role key which bypasses RLS.
 * Only use for trusted backend operations.
 */

let serviceClient: ReturnType<typeof createClient> | null = null

export function createServiceClient() {
    if (serviceClient) {
        return serviceClient
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY

    if (!supabaseUrl) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
    }

    if (!serviceRoleKey) {
        throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
    }

    serviceClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })

    return serviceClient
}
