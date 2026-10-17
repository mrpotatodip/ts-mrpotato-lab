import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { PowerMark } from "#/modules/shared";
import { useActiveTenantRole } from "#/modules/tenant";
import { useChatBotThreadActions } from "../hooks/use-chat-bot-thread-actions";
import { toThreadTitle } from "../utils";
import { ChatBotThreadRenameDialog } from "./chat-bot-thread-rename-dialog";

type ChatBotThreadOverflowProps = {
  threadId: string;
  title: string | null;
};

export function ChatBotThreadOverflow({
  threadId,
  title,
}: ChatBotThreadOverflowProps) {
  const { remove } = useChatBotThreadActions();
  const { can } = useActiveTenantRole();
  const canRename = can("company:assistant:threads:update");
  const canDelete = can("company:assistant:threads:delete");
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const label = toThreadTitle(title);

  const confirmDelete = () => {
    remove.mutate(threadId);
  };

  if (!canRename && !canDelete) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Chat thread actions"
              className="shrink-0"
              onClick={(event) => event.preventDefault()}
            />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canRename ? (
            <DropdownMenuItem className="justify-between gap-4" onClick={() => setTimeout(() => setRenameOpen(true), 0)}>
              Rename
              <PowerMark inMenu power="company:assistant:threads:update" />
            </DropdownMenuItem>
          ) : null}
          {canDelete ? (
            <DropdownMenuItem
              className="text-destructive justify-between gap-4"
              onClick={() => setTimeout(() => setDeleteOpen(true), 0)}
            >
              Delete
              <PowerMark inMenu power="company:assistant:threads:delete" />
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <ChatBotThreadRenameDialog
        threadId={threadId}
        label={label}
        open={renameOpen}
        onOpenChange={setRenameOpen}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete chat</DialogTitle>
            <DialogDescription>
              {label} and its messages will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={remove.isPending}
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
