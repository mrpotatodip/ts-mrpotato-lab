import { useRef, useState } from "react";

import { Button } from "#/components/ui/button";
import { PageCard, PowerMark } from "#/modules/shared";
import { useMenuImportActions } from "../hooks";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";

// -----
// One PDF, or up to 10 images. The server checks the
// same rules; this only saves a round trip.
// -----
export function MenuImportUpload() {
  const { upload } = useMenuImportActions();
  const input = useRef<HTMLInputElement>(null);
  const [count, setCount] = useState(0);

  return (
    <PageCard
      title="Upload a menu"
      description="One PDF, or up to 10 photos."
      action={<PowerMark power="company:menu:imports:create" />}
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const files = input.current?.files;
          if (!files || files.length === 0) return;
          const form = new FormData();
          for (const file of files) form.append("files", file);
          upload.mutate(
            { data: form },
            {
              onSuccess: () => {
                if (input.current) input.current.value = "";
                setCount(0);
              },
            },
          );
        }}
      >
        <p className="text-muted-foreground text-sm">
          Photos can be JPEG, PNG or WebP, up to 10 MB each. Amelie reads them and makes drafts for you to review.
          Nothing goes live until you publish.
        </p>
        <input
          ref={input}
          type="file"
          aria-label="Menu files"
          accept={ACCEPT}
          multiple
          onChange={(event) => setCount(event.target.files?.length ?? 0)}
        />
        {upload.isError ? <p className="text-xs text-destructive">{upload.error.message}</p> : null}
        <Button type="submit" size="sm" className="w-fit" disabled={count === 0 || upload.isPending}>
          {upload.isPending ? "Uploading..." : "Upload menu"}
        </Button>
      </form>
    </PageCard>
  );
}
