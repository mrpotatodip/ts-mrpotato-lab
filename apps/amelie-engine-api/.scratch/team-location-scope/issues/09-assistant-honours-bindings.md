# 09: The chat assistant honours bindings

**What to build:** the signed-in assistant cannot do for a bound member what the dashboard refuses. Its admin tools (hours, overrides, item prices) check the same coverage and the same bound/unbound split as the routes, and its Location resolution works over the covered Locations. It does not reach the routes' guard, so this is its own check. Customers and the public widget are not affected.

**Blocked by:** 05: Enforce a binding on business hours (the tracer for the guard)

**Status:** ready-for-agent

- [ ] Asked to change hours at an uncovered Location, the assistant is refused and says the member's Role does not cover it.
- [ ] A member covering one Location can omit it in chat; one covering several gets "needs location" with only their options.
- [ ] An unbound member and the public widget behave as before.
