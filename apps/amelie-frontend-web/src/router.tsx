import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { routeTree } from './routeTree.gen'

import { QueryClient } from '@tanstack/react-query'
import { createMutationToastCache } from './lib/mutation-toast'

export function getRouter() {
  const queryClient = new QueryClient({
    mutationCache: createMutationToastCache(),
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
      // overwritten by __root.tsx's beforeLoad before anything renders —
      // required here only to satisfy the root context type
      user: null,
    },
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
  })

  // Dehydrates the server-populated query cache (e.g. loader query()
  // calls) into the SSR payload and rehydrates it client-side, so hydration
  // reuses that data instead of silently re-fetching from scratch.
  setupRouterSsrQueryIntegration({ router, queryClient })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
