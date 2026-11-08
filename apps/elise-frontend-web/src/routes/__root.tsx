import { HeadContent, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { Toaster } from "#/components/ui/sonner";
import { fetchSession } from "#/modules/auth/api";
import type { SessionUser } from "#/modules/auth";
import appCss from "../styles/globals.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient; user: SessionUser | null }>()({
  beforeLoad: async () => ({ user: await fetchSession() }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Elise" },
      { name: "description", content: "Elise runs an AI security review on a public GitHub repository and saves the report." },
      { name: "theme-color", content: "#f1f2f4" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16.png" },
      { rel: "icon", sizes: "any", href: "/favicon.ico" },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased [overflow-wrap:anywhere]">
        {children}
        <Toaster />
        <Scripts />
      </body>
    </html>
  );
}
