import { useState } from "react";
import { Check, Leaf, Moon, MoonStar, Palette, Sun, type LucideIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "#/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { cn } from "#/lib/utils";
import { THEMES, useTheme, type Theme } from "../hooks";

// -----
// `page`, `card` and `ink` are a fixed miniature of each theme for its preview
// tile. They are not tokens: a tile must show its own theme, not the active one.
// -----
const THEME_COPY = {
  default: { label: "Default", note: "Soft gray, light", Icon: Palette, page: "#f1f2f4", card: "#fcfcfd", ink: "#23262b" },
  midnight: { label: "Midnight", note: "Soft gray, dark", Icon: MoonStar, page: "#17191d", card: "#25282e", ink: "#eceef1" },
  daylight: { label: "Daylight", note: "Bright, glass over a sky", Icon: Sun, page: "#cfe3f7", card: "#ffffff", ink: "#1a1d21" },
  greenfields: { label: "Greenfields", note: "Bright, glass over green fields", Icon: Leaf, page: "#dcefd9", card: "#ffffff", ink: "#16231a" },
  moonlight: { label: "Moonlight", note: "Dark, glass over a night sky", Icon: Moon, page: "#1c2340", card: "#2b3350", ink: "#eceef1" },
} satisfies Record<Theme, { label: string; note: string; Icon: LucideIcon; page: string; card: string; ink: string }>;

type ShellThemeSwitchProps = {
  collapsed?: boolean;
  tooltipSide?: "top" | "right" | "bottom" | "left";
};

// -----
// One button in the sidebar opens a dialog with every theme as a preview
// tile, so the list can grow without crowding the footer. Picking a tile
// applies the theme at once and closes the dialog.
// -----
export function ShellThemeSwitch({ collapsed = false, tooltipSide = "right" }: ShellThemeSwitchProps) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const { Icon, label } = THEME_COPY[theme];

  const trigger = collapsed ? (
    <Tooltip>
      <TooltipTrigger
        render={
          <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Theme: ${label}. Change theme`} className="text-muted-foreground" />} />
        }
      >
        <Icon strokeWidth={1.5} />
      </TooltipTrigger>
      <TooltipContent side={tooltipSide}>
        Theme: {label}
        <span className="block text-muted-foreground">Click to change</span>
      </TooltipContent>
    </Tooltip>
  ) : (
    <DialogTrigger
      render={
        <button
          type="button"
          aria-label={`Theme: ${label}. Change theme`}
          className="flex h-10 w-full items-center gap-2.5 rounded-lg border bg-muted px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      }
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.5} />
      <span className="min-w-0 flex-1 truncate text-left">Theme</span>
      <span className="text-xs text-foreground">{label}</span>
    </DialogTrigger>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger}
      <DialogContent className="max-w-[34rem]">
        <DialogHeader>
          <DialogTitle>Theme</DialogTitle>
          <DialogDescription>Pick how Elise looks. It is saved in this browser.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <fieldset className="m-0 grid min-w-0 gap-3 border-0 p-0 sm:grid-cols-2">
            <legend className="sr-only">Theme</legend>
            {THEMES.map((value) => {
              const copy = THEME_COPY[value];
              const selected = value === theme;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setTheme(value);
                    setOpen(false);
                  }}
                  className={cn(
                    "grid gap-2.5 rounded-xl border p-2.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected && "border-primary bg-accent",
                  )}
                >
                  <span aria-hidden="true" className="grid h-20 grid-cols-[2.5rem_1fr] gap-1.5 rounded-lg border p-1.5" style={{ backgroundColor: copy.page }}>
                    <span className="rounded-md opacity-60" style={{ backgroundColor: copy.card }} />
                    <span className="grid content-start gap-1.5 rounded-md p-1.5" style={{ backgroundColor: copy.card }}>
                      <span className="h-1.5 w-2/3 rounded-full" style={{ backgroundColor: copy.ink }} />
                      <span className="h-1.5 w-1/2 rounded-full opacity-40" style={{ backgroundColor: copy.ink }} />
                    </span>
                  </span>
                  <span className="flex items-start gap-2 px-0.5">
                    <copy.Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                    <span className="grid min-w-0 flex-1 leading-tight">
                      <span className="text-sm font-medium">{copy.label}</span>
                      <span className="text-xs text-muted-foreground">{copy.note}</span>
                    </span>
                    {selected && <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={2} />}
                  </span>
                </button>
              );
            })}
          </fieldset>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
