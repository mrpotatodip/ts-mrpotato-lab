import type { AccessPower } from "@repo/contracts/amelie";

import { PowerMark } from "./power-mark";

type PageHeaderProps = {
  title: string;
  description: string;
  power?: AccessPower;
};

// -----
// The title and one line about the screen, the same
// on every dashboard page.
// -----
export function PageHeader({ title, description, power }: PageHeaderProps) {
  return (
    <header className="mb-6 space-y-2">
      <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
        {title}
        {power ? <PowerMark power={power} /> : null}
      </h1>
      <p className="text-muted-foreground text-base">{description}</p>
    </header>
  );
}
