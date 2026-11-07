import { useRouter } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import { signOut as signOutFn } from "../api";

export function AuthSignOutButton() {
  const router = useRouter();

  const signOut = async () => {
    await signOutFn();
    await router.invalidate();
    await router.navigate({ to: "/signin" });
  };

  return (
    <Button variant="outline" size="sm" onClick={signOut}>
      Sign out
    </Button>
  );
}
