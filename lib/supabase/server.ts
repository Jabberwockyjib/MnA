
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()

    // When running locally (npm run dev), use the public URL
    // When running in Docker, use the internal URL (kong:8000)
    // Detect Docker by checking if we can resolve 'kong' or if RUNNING_IN_DOCKER is set
    const isRunningInDocker = process.env.RUNNING_IN_DOCKER === 'true'
    const supabaseUrl = isRunningInDocker
        ? (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!)
        : process.env.NEXT_PUBLIC_SUPABASE_URL!

    return createServerClient(
        supabaseUrl,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}
