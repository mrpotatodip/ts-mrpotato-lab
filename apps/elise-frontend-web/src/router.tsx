import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { routeTree } from './routeTree.gen'
import { ShellRouteError, ShellRouteNotFound, ShellRoutePending } from '#/modules/shell'

import { QueryClient } from '@tanstack/react-query'

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
      },
    },
  })

  const router = createTanStackRouter({
    routeTree,
    context: {
      queryClient,
      user: null,
    },
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadDelay: 30,
    defaultPreloadStaleTime: 0,
    defaultPendingMs: 150,
    defaultPendingMinMs: 250,
    defaultPendingComponent: ShellRoutePending,
    defaultErrorComponent: ShellRouteError,
    defaultNotFoundComponent: ShellRouteNotFound,
  })

  // -----
  // Dehydrates the server-populated query cache (e.g. loader query()
  // calls) into the SSR payload and rehydrates it client-side, so hydration
  // reuses that data instead of silently re-fetching from scratch.
  // -----
  setupRouterSsrQueryIntegration({ router, queryClient })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
