import { redirect } from 'next/navigation'
import { Separator } from '@/components/ui/separator'
import { GoogleConnectionCard } from '@/components/settings/google-connection-card'
import { createClient } from '@/lib/supabase/server'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get the user's active deals to provide links
  const { data: deals } = await supabase
    .from('deals')
    .select(`
      id,
      name,
      deal_members!inner(user_id)
    `)
    .eq('deal_members.user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const activeDeal = deals?.[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and integrations
        </p>
      </div>
      <Separator />

      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-4">Integrations</h2>
          <div className="space-y-4">
            <GoogleConnectionCard
              initialSuccess={params.success}
              initialError={params.error}
              activeDealId={activeDeal?.id}
              activeDealName={activeDeal?.name}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
