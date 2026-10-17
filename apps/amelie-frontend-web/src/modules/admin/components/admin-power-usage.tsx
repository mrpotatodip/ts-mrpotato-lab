import { Route } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import type { AdminPowerOption } from "../types";
import { adminPowerUsageLines } from "../utils";

type AdminPowerUsageProps = {
  label: string;
  options: AdminPowerOption[];
};

function actionLabel(action: string): string {
  return action.charAt(0).toUpperCase() + action.slice(1);
}

// -----
// A small icon beside a section of the checklist. Its tip
// says, per Action, which API routes and Assistant tools
// refuse without that Power.
// -----
export function AdminPowerUsage({ label, options }: AdminPowerUsageProps) {
  const lines = adminPowerUsageLines(options);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={`Where ${label} is checked`}
            className="text-muted-foreground hover:text-foreground rounded-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          />
        }
      >
        <Route className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent className="max-w-sm" side="top" align="start">
        <ul className="flex flex-col gap-2 text-xs">
          {lines.map((line) => (
            <li key={line.power} className="flex flex-col gap-0.5">
              <span className="font-medium">{actionLabel(line.action)}</span>
              {line.note ? <span className="text-muted-foreground">{line.note}</span> : null}
              {line.routes.map((route) => (
                <span key={route} className="font-mono">
                  {route}
                </span>
              ))}
              {line.tools.map((tool) => (
                <span key={tool} className="font-mono">
                  Assistant tool: {tool}
                </span>
              ))}
            </li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}
