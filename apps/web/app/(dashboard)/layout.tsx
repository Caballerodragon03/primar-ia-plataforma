export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar — Fase 1B */}
      <aside className="w-[140px] bg-white border-r border-border flex-shrink-0" />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
