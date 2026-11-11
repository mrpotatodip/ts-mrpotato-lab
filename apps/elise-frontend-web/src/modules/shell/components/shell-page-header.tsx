import type { ReactNode } from "react";

type ShellPageHeaderProps = {
  title: ReactNode;
  description?: string;
  badges?: ReactNode;
  below?: ReactNode;
  children?: ReactNode;
};

// -----
// `badges` sit beside the title (status, branch chip, a link), `below`
// is full-width facts under it, and `children` are the actions on the right.
// -----
export function ShellPageHeader({ title, description, badges, below, children }: ShellPageHeaderProps) {
  return (
    <div data-slot="page-header" className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="grid min-w-0 gap-1.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="text-[26px] font-semibold leading-none tracking-tight">{title}</h1>
            {badges}
          </div>
          {description && <p className="max-w-copy text-sm leading-relaxed text-muted-foreground">{description}</p>}
        </div>
        {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
      </div>
      {below}
    </div>
  );
}
