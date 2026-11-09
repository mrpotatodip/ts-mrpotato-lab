import type { ReactNode } from "react";

type ShellPageHeaderProps = {
  title: string;
  description?: string;
  children?: ReactNode;
};

export function ShellPageHeader({ title, description, children }: ShellPageHeaderProps) {
  return (
    <div data-slot="page-header" className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="grid gap-1.5">
        <h1 className="text-[26px] font-semibold leading-none tracking-tight">{title}</h1>
        {description && <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
