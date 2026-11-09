import { Moon, Palette, Sun, type LucideIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { cn } from "#/lib/utils";
import { THEMES, useTheme, type Theme } from "../hooks";

const THEME_COPY = {
  default: { label: "Default", note: "Soft gray", Icon: Palette },
  daylight: { label: "Daylight", note: "Bright, glass over a sky", Icon: Sun },
  moonlight: { label: "Moonlight", note: "Dark, glass over a night sky", Icon: Moon },
} satisfies Record<Theme, { label: string; note: string; Icon: LucideIcon }>;

type ShellThemeSwitchProps = {
  collapsed?: boolean;
};

// -----
// Three themes, all visible at once: one tap to pick, and the chosen one is
// filled. In the collapsed rail there is no room for three, so one button
// steps to the next theme and its tooltip names the current one.
// -----
export function ShellThemeSwitch({ collapsed = false }: ShellThemeSwitchProps) {
  const { theme, setTheme } = useTheme();

  if (collapsed) {
    const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length] ?? "default";
    const { Icon, label } = THEME_COPY[theme];
    return (
      <Tooltip>
        <TooltipTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label={`Theme: ${label}. Switch to ${THEME_COPY[next].label}`} className="text-muted-foreground" onClick={() => setTheme(next)} />}
        >
          <Icon strokeWidth={1.5} />
        </TooltipTrigger>
        <TooltipContent side="right">
          Theme: {label}
          <span className="block text-muted-foreground">Click for {THEME_COPY[next].label}</span>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <fieldset className="m-0 grid min-w-0 grid-cols-3 gap-0.5 rounded-lg border bg-muted p-0.5">
      <legend className="sr-only">Theme</legend>
      {THEMES.map((value) => {
        const { Icon, label, note } = THEME_COPY[value];
        const selected = value === theme;
        return (
          <Tooltip key={value}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-pressed={selected}
                  aria-label={label}
                  onClick={() => setTheme(value)}
                  className={cn(
                    "flex h-8 items-center justify-center gap-1.5 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected && "bg-popover text-foreground shadow-raised",
                  )}
                />
              }
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.5} />
            </TooltipTrigger>
            <TooltipContent side="top">
              {label}
              <span className="block text-muted-foreground">{note}</span>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </fieldset>
  );
}
