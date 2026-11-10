import { TooltipProvider } from "#/components/ui/tooltip";
import { ShellThemeSwitch } from "./shell-theme-switch";

// -----
// The theme button for pages with no sidebar (sign in, sign up, invite). It
// sits in the top right corner and is out of the page's own layout, so it
// never moves the card. The dashboard's TooltipProvider is not around these
// pages, so it brings its own. data-public-page tells the stylesheet this page
// has no top bar (the sky then starts at the top).
// -----
export function ShellPublicThemeSwitch() {
  return (
    <div data-public-page className="fixed right-4 top-4 z-10">
      <TooltipProvider>
        <ShellThemeSwitch collapsed tooltipSide="bottom" />
      </TooltipProvider>
    </div>
  );
}
