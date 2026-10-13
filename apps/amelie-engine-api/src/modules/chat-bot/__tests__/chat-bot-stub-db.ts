import type { DbConnectType } from "#/lib/db-connection";

type StubChain = () => StubChain;

// -----
// Any Drizzle chain or transaction resolves to
// the next queued result, or rejects on an Error.
// -----
export function stubDb(...results: Array<object | Error>): DbConnectType {
  const queue = [...results];
  const chain = (): StubChain =>
    new Proxy<StubChain>(() => chain(), {
      get: (_target, prop) => {
        if (prop !== "then") return chain;
        const next = queue.shift() ?? [];
        const settled = next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
        return settled.then.bind(settled);
      },
    });
  // -----
  // SAFETY: the effects under test only build
  // and await query chains.
  // -----
  return chain() as never;
}
