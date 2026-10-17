import { ShieldCheck } from "lucide-react";
import { describeAccessPower, type AccessPower } from "@repo/contracts/amelie";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { cn } from "#/lib/utils";
import { usePowerMarksVisible } from "./power-marks-context";

type PowerMarkProps = {
  power: AccessPower;
  className?: string;
  inMenu?: boolean;
};

// -----
// A small shield beside whatever a Power guards. Its tip names
// the Power, so a person can see why a control is there, or
// why it is missing from their role. Shown only when the shell
// says so (a superuser who switched it on). Inside a menu it is
// not a button, so a menu item never holds another control.
// -----
export function PowerMark({ power, className, inMenu = false }: PowerMarkProps) {
  const visible = usePowerMarksVisible();
  const label = describeAccessPower(power)?.label ?? power;

  if (!visible) return null;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          inMenu ? (
            <span
              className={cn("text-muted-foreground/70 inline-flex shrink-0", className)}
              title={`Needs ${label}`}
            />
          ) : (
            <button
              type="button"
              aria-label={`Needs ${label}`}
              className={cn(
                "text-muted-foreground/70 hover:text-foreground inline-flex shrink-0 rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                className,
              )}
            />
          )
        }
      >
        <ShieldCheck className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="text-xs font-medium">Needs {label}</p>
        <p className="text-muted-foreground font-mono text-xs">{power}</p>
      </TooltipContent>
    </Tooltip>
  );
}
