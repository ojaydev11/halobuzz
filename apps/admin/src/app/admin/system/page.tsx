export default function SystemPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System & Config</h1>
        <p className="text-muted-foreground">
          Feature flags, kill switches, and system configuration (Super Admin Only)
        </p>
      </div>
      <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4 text-sm text-yellow-700 dark:text-yellow-400">
        <p className="font-semibold">Super Admin Only</p>
        <p className="mt-1">This section is only accessible to super administrators.</p>
      </div>
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        <p>System configuration coming soon...</p>
        <p className="mt-2 text-sm">
          Will include feature flags, kill switches, rate limits, and secrets management
        </p>
      </div>
    </div>
  );
}
