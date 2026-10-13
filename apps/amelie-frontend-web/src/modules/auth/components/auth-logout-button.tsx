import { Button } from "#/components/ui/button";
import { useAuthActions } from "../hooks";

export function LogoutButton() {
  const { logout } = useAuthActions();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={logout.isPending}
      onClick={() => logout.mutate()}
    >
      {logout.isPending ? "Signing out..." : "Log out"}
    </Button>
  );
}
