// -----
// For a route loader: a failed prefetch gives undefined
// instead of throwing, so the route still loads and the
// page's own suspense hook retries behind its skeleton.
// Wrap queryClient.query(options), which skips fresh data.
// -----
export const prefetchQuietly = <T>(prefetch: Promise<T>) => prefetch.catch(() => undefined);
