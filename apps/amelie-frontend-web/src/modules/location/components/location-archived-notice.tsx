import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";

import { Button, buttonVariants } from "#/components/ui/button";
import { Card, CardContent } from "#/components/ui/card";
import type { LocationArchivedNotice as ArchivedNotice } from "../schemas";

type LocationArchivedNoticeProps = {
  notice: ArchivedNotice;
  onDismiss: () => void;
};

// -----
// Stays up until dismissed: names the Location that
// was archived and any menu items it left sold
// nowhere, with a way to the Menu to fix them.
// -----
export function LocationArchivedNotice({ notice, onDismiss }: LocationArchivedNoticeProps) {
  const { name, unsoldMenuItems } = notice;

  return (
    <output className="block">
      <Card className="border-destructive/40">
        <CardContent className="flex items-start justify-between gap-3 p-4 text-sm">
          <div className="space-y-2">
            <p className="font-medium">Archived {name}.</p>
            {unsoldMenuItems.length > 0 ? (
              <>
                <p className="text-muted-foreground">These menu items are now not sold at any open location:</p>
                <ul className="list-disc pl-5">
                  {unsoldMenuItems.map((item) => (
                    <li key={item.id}>{item.name}</li>
                  ))}
                </ul>
                <Link to="/menu" className={buttonVariants({ variant: "link", size: "sm", className: "h-auto px-0" })}>
                  Choose where they are sold in the Menu
                </Link>
              </>
            ) : null}
          </div>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Dismiss" title="Dismiss" onClick={onDismiss}>
            <X />
          </Button>
        </CardContent>
      </Card>
    </output>
  );
}
