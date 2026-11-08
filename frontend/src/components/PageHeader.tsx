import type { ReactNode } from 'react';
type PageHeaderProps = { title: string; description: string; actions?: ReactNode };
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="mb-7 flex flex-col flex-wrap justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
