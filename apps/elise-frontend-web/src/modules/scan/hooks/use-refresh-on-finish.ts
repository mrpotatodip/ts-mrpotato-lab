import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ScanState } from "../schemas";
import { isScanActive, scanKeys } from "./scan-queries";

// -----
// The report, the verdict and the comparison are read once and kept.
// When a scan this page is watching ends, read them again, so the
// findings show as soon as the status changes.
// -----
export function useRefreshOnFinish(status: ScanState) {
  const queryClient = useQueryClient();
  const before = useRef(status);

  useEffect(() => {
    if (isScanActive(before.current) && !isScanActive(status)) void queryClient.invalidateQueries({ queryKey: scanKeys.all });
    before.current = status;
  }, [status, queryClient]);
}
