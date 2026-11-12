import { ShellLogo } from "./shell-logo";

// -----
// The mark and name above the card on pages with no sidebar, the same lockup
// as the brand panel beside the sign-in form. It sits straight on the sky in
// the glass themes, so it takes the page header's slot name and with it the
// text halo that keeps it readable over bright clouds.
// -----
export function ShellPublicBrand() {
  return (
    <div data-slot="page-header" className="flex items-center justify-center gap-3 justify-self-center">
      <ShellLogo className="size-9 shrink-0" />
      <span className="text-xl font-semibold tracking-tight">Elise</span>
    </div>
  );
}
