import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { cn } from "#/lib/utils";

type PageCardProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  contentClassName?: string;
  children: ReactNode;
};

// -----
// A tinted header over a white, rounded body. The tint
// sits on the card so the body's curved corners
// show it, not white.
// -----
export function PageCard({ title, description, action, contentClassName, children }: PageCardProps) {
  return (
    <Card className="bg-muted/60 shadow-none">
      <CardHeader className={action ? "flex-row items-center justify-between space-y-0" : undefined}>
        <div className="space-y-0.5">
          <CardTitle className="text-lg">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent className={cn("rounded-3xl border-t bg-card pt-6", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
