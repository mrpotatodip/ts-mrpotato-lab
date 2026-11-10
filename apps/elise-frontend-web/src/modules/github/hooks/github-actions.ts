import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { disconnectGithub, finishGithubConnect, startGithubConnect } from "../api";
import type { ConnectGithubBody } from "../schemas";
import { githubKeys } from "./github-queries";

export function useGithubActions() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const connect = useMutation({
    mutationFn: () => startGithubConnect(),
    onSuccess: ({ url }) => window.location.assign(url),
    onError: (error) => toast.error(`We couldn't start the GitHub connection. ${error.message}`),
  });

  const finish = useMutation({
    mutationFn: (input: ConnectGithubBody) => finishGithubConnect({ data: input }),
    onSuccess: async (install) => {
      toast.success(`GitHub is connected as ${install.accountLogin}.`);
      await queryClient.invalidateQueries({ queryKey: githubKeys.all });
      await navigate({ to: "/connections" });
    },
  });

  const disconnect = useMutation({
    mutationFn: (id: string) => disconnectGithub({ data: { id } }),
    onSuccess: async (install) => {
      toast.success(`${install.accountLogin} is disconnected. Remove Elise in your GitHub settings too, to take its access away there.`);
      await queryClient.invalidateQueries({ queryKey: githubKeys.all });
    },
    onError: (error) => toast.error(`We couldn't disconnect it. ${error.message}`),
  });

  return { connect, finish, disconnect };
}
