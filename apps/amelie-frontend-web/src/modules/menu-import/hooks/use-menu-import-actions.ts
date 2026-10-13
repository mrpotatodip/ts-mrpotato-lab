import { useMutation, useQueryClient } from "@tanstack/react-query";
import { businessProfileKeys } from "#/modules/business-profile";
import { menuKeys } from "#/modules/menu";
import { tenantHoursKeys } from "#/modules/schedule";
import {
  approveAllMenuImportDrafts,
  publishMenuImport,
  updateMenuImportDraft,
  uploadMenuImport,
} from "../api";
import { menuImportsKeys } from "./use-menu-imports";

// -----
// Publishing changes the live menu, hours and profile,
// so the pages that show them reload too.
// -----
export function useMenuImportActions() {
  const queryClient = useQueryClient();
  const reload = () => queryClient.invalidateQueries({ queryKey: menuImportsKeys.all });

  const upload = useMutation({ mutationFn: uploadMenuImport, onSuccess: reload });
  const updateDraft = useMutation({ mutationFn: updateMenuImportDraft, onSuccess: reload });
  const approveAll = useMutation({ mutationFn: approveAllMenuImportDrafts, onSuccess: reload });
  const publish = useMutation({
    mutationFn: publishMenuImport,
    onSuccess: async () => {
      await reload();
      void queryClient.invalidateQueries({ queryKey: menuKeys.all });
      void queryClient.invalidateQueries({ queryKey: tenantHoursKeys.all });
      void queryClient.invalidateQueries({ queryKey: businessProfileKeys.all });
    },
  });

  return { upload, updateDraft, approveAll, publish };
}
