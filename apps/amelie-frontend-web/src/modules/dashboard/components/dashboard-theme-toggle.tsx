import { Monitor, Moon, Sun } from "lucide-react";

import { Button } from "#/components/ui/button";
import { useTheme, type ThemeMode } from "#/modules/shared";

const NEXT_MODE = { light: "dark", dark: "auto", auto: "light" } satisfies Record<ThemeMode, ThemeMode>;
const ICON = { light: Sun, dark: Moon, auto: Monitor } as const;

// -----
// One button that steps light, dark, then follow-the-device.
// -----
export function DashboardThemeToggle() {
  const { mode, setMode } = useTheme();
  const Icon = ICON[mode];

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={`Theme: ${mode}. Switch theme`}
      onClick={() => setMode(NEXT_MODE[mode])}
    >
      <Icon className="size-4" />
    </Button>
  );
}
