import { Button } from "#/components/ui/button";

type AuthFirstRunProps = {
  onContinue: () => void;
};

// -----
// Shown only when the app is launched from the home screen, where it
// always opens signed out — iOS gives standalone apps their own
// cookie jar, so the browser session never carries over.
// Deliberately holds no form: that keeps a single sign-in form in the
// DOM while both this and the real form are present, which is what
// lets the choice happen in CSS rather than after hydration.
// -----
export function AuthFirstRun({ onContinue }: AuthFirstRunProps) {
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
      <img
        src="/icon-192.png"
        alt=""
        className="size-20 rounded-2xl"
        aria-hidden="true"
      />

      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          You&apos;re all set up
        </h1>
        <p className="text-muted-foreground text-balance">
          Home-screen apps keep their own sign-in, separate from your browser.
          Sign in once and Amelie stays open for you.
        </p>
      </div>

      <Button size="lg" className="w-full" onClick={onContinue}>
        Sign in
      </Button>
    </div>
  );
}
