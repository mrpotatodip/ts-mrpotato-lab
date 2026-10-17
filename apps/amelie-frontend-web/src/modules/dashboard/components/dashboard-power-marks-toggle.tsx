import { ShieldCheck } from "lucide-react";

import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";
import { usePowerMarksPreference } from "#/modules/shared";

// -----
// Superusers only: shows or hides the shield beside every
// control a Power guards. It is a choice of this browser.
// -----
export function DashboardPowerMarksToggle() {
  const { on, setOn } = usePowerMarksPreference();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-pressed={on}
      aria-label={on ? "Hide power marks" : "Show power marks"}
      title={on ? "Hide power marks" : "Show power marks"}
      onClick={() => setOn(!on)}
    >
      <ShieldCheck className={cn("size-4", on ? "text-primary" : "text-muted-foreground")} />
    </Button>
  );
}
