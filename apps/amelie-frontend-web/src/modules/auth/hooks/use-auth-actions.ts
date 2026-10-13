import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { SignUpBody } from "@repo/contracts/amelie";
import { signinEmail, signOut, signUpCafe } from "../api";
import type { SigninFormValues } from "../types";
import { sessionKeys } from "./use-session";

export function useAuthActions() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const enterDashboard = () => {
    queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    navigate({ to: "/overview" });
  };

  const signin = useMutation({
    mutationFn: (values: SigninFormValues) => signinEmail({ data: values }),
    onSuccess: enterDashboard,
  });

  const signUp = useMutation({
    mutationFn: (body: SignUpBody) => signUpCafe({ data: body }),
    onSuccess: enterDashboard,
  });

  const logout = useMutation({
    mutationFn: () => signOut(),
    onSuccess: () => {
      queryClient.clear();
      navigate({ to: "/" });
    },
  });

  return { signin, signUp, logout };
}
