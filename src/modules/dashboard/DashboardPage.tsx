import { CheckSquare, Calendar, Target, BookOpen } from 'lucide-react';

export function DashboardPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Good morning</h1>
      <p className="text-[var(--color-text-muted)] mb-8 text-sm">
        Here&apos;s what&apos;s on your plate today.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<CheckSquare size={18} />} label="Tasks due" value="0" color="var(--color-accent)" />
        <StatCard icon={<Calendar size={18} />} label="Events today" value="0" color="var(--color-success)" />
        <StatCard icon={<Target size={18} />} label="Habits" value="0/0" color="var(--color-warning)" />
        <StatCard icon={<BookOpen size={18} />} label="Cards to review" value="0" color="var(--color-p1)" />
      </div>

      {/* Quick capture */}
      <div className="mb-8">
        <input
          type="text"
          placeholder="Quick add a task... (press Enter)"
          className="w-full px-4 py-3 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
        />
      </div>

      {/* Today sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Today's Tasks">
          <EmptyState message="No tasks due today. Add one above!" />
        </Section>
        <Section title="Today's Events">
          <EmptyState message="No events scheduled." />
        </Section>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
      <div className="p-2 rounded-md" style={{ backgroundColor: color + '20', color }}>
        {icon}
      </div>
      <div>
        <div className="text-lg font-semibold">{value}</div>
        <div className="text-xs text-[var(--color-text-muted)]">{label}</div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-4">
      <h2 className="text-sm font-semibold mb-3 text-[var(--color-text-secondary)]">{title}</h2>
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-8 text-center text-sm text-[var(--color-text-muted)]">
      {message}
    </div>
  );
}
