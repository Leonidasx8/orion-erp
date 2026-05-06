import type React from 'react';

export function PageHead({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="m-0 text-[22px] font-semibold tracking-tight text-orion-fg">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-orion-fg-muted">{subtitle}</p>}
      </div>
      {actions && <div className="ml-auto flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}
