import { FileText, ScanSearch, ShieldCheck } from "lucide-react";
import { ShellLogo } from "#/modules/shell";
import { AUTH_BRAND_COPY } from "../constants";

const POINT_ICONS = [ScanSearch, FileText, ShieldCheck];

// -----
// Beside the form on wide screens, hidden below that where the form needs the
// width. It sits straight on the sky in the glass themes, so it takes the page
// header's slot name and with it the text halo that keeps text readable.
// -----
export function AuthBrandPanel() {
  return (
    <aside data-slot="page-header" className="hidden flex-col gap-12 p-12 lg:flex">
      <div className="flex items-center gap-3">
        <ShellLogo className="size-10 shrink-0" />
        <span className="text-xl font-semibold tracking-tight">EliseLAB</span>
      </div>
      <div className="my-auto grid max-w-md gap-10">
        <p className="text-balance text-3xl font-semibold leading-tight tracking-tight">{AUTH_BRAND_COPY.headline}</p>
        <ul className="grid gap-6">
          {AUTH_BRAND_COPY.points.map((point, index) => {
            const Icon = POINT_ICONS[index];
            return (
              <li key={point.title} className="flex items-start gap-4">
                {Icon && <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" strokeWidth={1.5} />}
                <div className="grid gap-1">
                  <p className="text-[15px] font-medium">{point.title}</p>
                  <p className="max-w-copy text-sm leading-relaxed text-muted-foreground">{point.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
