import { useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";

export const AppErrorComponent = ({ error, reset }: ErrorComponentProps) => {
  const router = useRouter();

  return (
    <div className="flex flex-col items-start gap-3 rounded-md bg-status-danger-soft p-4">
      <p className="text-sm text-status-danger">
        {error instanceof Error ? error.message : "Something went wrong."}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          // -----
          // invalidate re-runs the loader (retries query());
          // reset clears this boundary so the retried render can show.
          // -----
          router.invalidate();
          reset();
        }}
      >
        Try again
      </Button>
    </div>
  );
};
