interface StatCardProps {
  label: string;
  value: string | number;
  detail?: string;
  tone?: 'default' | 'success' | 'danger' | 'brand';
}

export default function StatCard({
  label,
  value,
  detail,
  tone = 'default',
}: StatCardProps) {
  const valueColor =
    tone === 'success'
      ? 'text-[#0f5257]'
      : tone === 'danger'
        ? 'text-[#be123c]'
        : tone === 'brand'
          ? 'text-[#0f5257]'
          : 'text-zinc-900';

  return (
    <div className="px-5 py-4 flex flex-col justify-between gap-1.5">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      <div className={`text-2xl font-bold font-display tabular-nums tracking-tight ${valueColor}`}>
        {value}
      </div>
      {detail && (
        <p className="text-xs text-zinc-500 tabular-nums">{detail}</p>
      )}
    </div>
  );
}
