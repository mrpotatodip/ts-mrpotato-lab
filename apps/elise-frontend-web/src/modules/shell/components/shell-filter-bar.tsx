import type { ComponentProps, ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { cn } from "#/lib/utils";

// -----
// The strip above a list inside its card: filters on the left, search
// on the right. Scans, Files and Repositories all use it, so they read
// as one pattern.
// -----
export function ShellFilterBar({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3", className)}>{children}</div>;
}

type ShellSearchFieldProps = Omit<ComponentProps<typeof Input>, "id" | "type"> & {
  id: string;
  label: string;
};

export function ShellSearchField({ id, label, className, ...input }: ShellSearchFieldProps) {
  return (
    <div className={cn("relative w-full sm:w-80", className)}>
      <Label htmlFor={id} className="sr-only">
        {label}
      </Label>
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input id={id} type="search" autoComplete="off" className="pl-9" {...input} />
    </div>
  );
}
