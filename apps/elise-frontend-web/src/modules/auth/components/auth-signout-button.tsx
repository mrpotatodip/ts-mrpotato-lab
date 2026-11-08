import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { signOut as signOutFn } from "../api";

export function AuthSignOutButton() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const signOut = async () => {
    await signOutFn();
    queryClient.clear();
    await router.invalidate();
    await router.navigate({ to: "/signin" });
  };

  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Sign out" className="text-muted-foreground" onClick={signOut} />}>
        <LogOut strokeWidth={1.5} />
      </TooltipTrigger>
      <TooltipContent>Sign out</TooltipContent>
    </Tooltip>
  );
}
