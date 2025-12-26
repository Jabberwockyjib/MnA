import { Separator } from '@/components/ui/separator'

export default function SettingsPage() {
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
            {/* GoogleConnectionCard will go here */}
          </div>
        </section>
      </div>
    </div>
  )
}
