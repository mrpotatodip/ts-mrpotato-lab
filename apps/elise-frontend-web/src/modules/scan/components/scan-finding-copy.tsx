import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";

export function ScanFindingCopy({ text, label = "Copy for coding agent" }: { text: string; label?: string }) {
  const copy = () => {
    navigator.clipboard.writeText(text).then(
      () => toast.success("Copied. Paste it into your coding agent."),
      () => toast.error("Could not copy. Allow clipboard access and try again."),
    );
  };

  return (
    <Button variant="outline" size="sm" className="w-fit" onClick={copy}>
      <Copy aria-hidden="true" className="size-3.5" />
      {label}
    </Button>
  );
}
