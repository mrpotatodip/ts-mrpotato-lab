import { useQuery } from "@tanstack/react-query";
import { CircleAlert, Undo2 } from "lucide-react";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { scanDiffQuery } from "../hooks";
import { scanPlural } from "../utils";

// -----
// The two things on a scan that cannot wait, said in the words the branch
// page uses for the same facts: problems that came back after being fixed,
// and open problems this scan did not re-check. The card below holds the
// detail, row by row. Nothing shows when there is nothing to say, or while
// the comparison is still loading.
// -----
export function ScanChangeAlerts({ scanId }: { scanId: string }) {
  const { data } = useQuery(scanDiffQuery(scanId));
  if (!data || data.previousScanId === null) return null;

  const back = data.regressed.length;
  const unchecked = data.notRechecked.length;
  if (back === 0 && unchecked === 0) return null;

  return (
    <>
      {back > 0 && (
        <Alert variant="destructive">
          <Undo2 />
          <AlertDescription>
            <span className="font-medium">{scanPlural(back, "problem came", "problems came")} back after being fixed.</span> This scan reported {back === 1 ? "it" : "them"} again. Find the change that brought {back === 1 ? "it" : "them"} back.
          </AlertDescription>
        </Alert>
      )}
      {unchecked > 0 && (
        <Alert variant="warning">
          <CircleAlert />
          <AlertDescription>
            <span className="font-medium">{scanPlural(unchecked, "open problem was", "open problems were")} not re-checked by this scan.</span> Treat {unchecked === 1 ? "it" : "them"} as still open.
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
