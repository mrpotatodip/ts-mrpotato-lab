import { LogoutButton } from "#/modules/auth";

// -----
// For a login that belongs to no cafe. It offers
// only Log out: nothing here needs a cafe.
// -----
export function TenantNoCafe() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            You&apos;re not part of a cafe yet
          </h1>
          <p className="text-muted-foreground text-balance">
            Ask your cafe&apos;s owner to add you.
          </p>
        </div>
        <LogoutButton />
      </div>
    </main>
  );
}
