import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { scan } from "react-scan";
import { getSession } from "#/modules/auth";
import type { SessionUser } from "#/modules/auth";
import appCss from "../styles/globals.css?url";

// -----
// Client-only, dev-only — this module also evaluates
// server-side during SSR, where `window`/scan() don't apply.
// -----
if (typeof window !== "undefined") {
  scan({ enabled: import.meta.env.DEV });
}

// -----
// Runs before first paint so the stored theme is on <html> ahead of any
// markup — a theme resolved after hydration would flash the wrong one.
// Light is the default when nothing is stored. Kept in step by hand
// with apply() in modules/shared/hooks/use-theme.ts, which cannot be
// imported here: this has to ship as an inline string.
// -----
const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'light';var resolved=mode==='auto'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;var tc=document.querySelector('meta[name="theme-color"]');if(tc){tc.setAttribute('content',resolved==='dark'?'#110f0e':'#fbfaf9')}}catch(e){}})();`;

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  user: SessionUser | null;
}>()({
  beforeLoad: async () => ({
    user: await getSession(),
  }),
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      // -----
      // `default` keeps iOS drawing the status bar itself, so the top
      // inset stays ~0 in portrait. Switching to `black-translucent`
      // for an edge-to-edge look is a value change here — the
      // env(safe-area-inset-*) padding it needs is already in place.
      // -----
      {
        name: "apple-mobile-web-app-status-bar-style",
        content: "default",
      },
      {
        title: "Amelie",
      },
      {
        name: "description",
        content: "Amelie answers your customers' questions from your cafe's own hours, menu and FAQs.",
      },
      // -----
      // SSR default only, and white because light is the default theme.
      // THEME_INIT_SCRIPT rewrites this before paint to match the
      // resolved theme, and useTheme rewrites it again on every toggle.
      // Two media-scoped tags do not work: React hoists meta into head
      // and dedupes by name, so the second silently wins — and a media
      // query would ignore the manual choice anyway.
      // -----
      {
        name: "theme-color",
        content: "#fbfaf9",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "manifest",
        href: "/manifest.json",
      },
      // -----
      // iOS ignores the manifest icons entirely and reads this one.
      // -----
      {
        rel: "apple-touch-icon",
        href: "/apple-touch-icon.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/favicon-32.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/favicon-16.png",
      },
      {
        rel: "icon",
        sizes: "any",
        href: "/favicon.ico",
      },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="font-sans antialiased [overflow-wrap:anywhere] ">
        {children}
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
