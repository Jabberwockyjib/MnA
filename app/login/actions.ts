'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
    const supabase = await createClient()

    // type-casting here for convenience
    // in a real app, you might validate this with Zod
    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        redirect('/login?error=Could not authenticate user')
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signUp(data)

    if (error) {
        redirect('/login?error=Could not authenticate user')
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

export async function loginWithGoogle() {
    const supabase = await createClient()
    const headersList = await headers()
    const origin = headersList.get('origin') || 'http://localhost:3011'

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${origin}/auth/callback`,
            queryParams: {
                access_type: 'offline',
                prompt: 'consent',
            },
        },
    })

    if (error) {
        console.error('Google OAuth error:', error)
        redirect('/login?error=Could not start Google sign-in')
    }

    if (data.url) {
        redirect(data.url)
    }
}

export async function loginAsDev() {
    const supabase = await createClient()

    // Development user credentials
    const email = 'admin@example.com'
    const password = 'password123'

    // Try to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
    })

    // If failed, maybe user doesn't exist? Try to sign up
    if (signInError) {
        console.log("Dev user not found, creating...", signInError.message)
        const { error: signUpError } = await supabase.auth.signUp({
            email,
            password
        })

        if (signUpError) {
            console.error("Failed to create dev user", signUpError)
            redirect('/login?error=Could not create dev user')
        }
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}
