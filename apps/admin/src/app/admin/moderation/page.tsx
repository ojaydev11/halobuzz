export default function ModerationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Moderation & Safety</h1>
        <p className="text-muted-foreground">Content moderation and safety policies</p>
      </div>
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        <p>Moderation queue coming soon...</p>
        <p className="mt-2 text-sm">
          Will include flag queue with ML scores, policy configuration, and bulk actions
        </p>
      </div>
    </div>
  );
}
