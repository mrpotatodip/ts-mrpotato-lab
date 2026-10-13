import { useForm } from "@tanstack/react-form";
import {
  CHAT_BOT_THREAD_TITLE_MAX,
  ChatBotTitleBodySchema,
} from "@repo/contracts/chat-bots";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { useChatBotThreadActions } from "../hooks/use-chat-bot-thread-actions";

type ChatBotThreadRenameDialogProps = {
  threadId: string;
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ChatBotThreadRenameFormProps = {
  threadId: string;
  label: string;
  onDone: () => void;
};

// -----
// Mounted per open, so each open starts
// from the thread's current title.
// -----
function ChatBotThreadRenameForm({ threadId, label, onDone }: ChatBotThreadRenameFormProps) {
  const { rename } = useChatBotThreadActions();
  const form = useForm({
    defaultValues: { title: label },
    validators: {
      onChange: ({ value }) => {
        const result = ChatBotTitleBodySchema.safeParse(value);
        if (result.success) return undefined;
        return result.error.issues.map((issue) => issue.message).join(", ");
      },
    },
    onSubmit: ({ value }) => {
      const { title } = ChatBotTitleBodySchema.parse(value);
      rename.mutate({ id: threadId, title }, { onSuccess: onDone });
    },
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.Field name="title">
        {(field) => (
          <Input
            value={field.state.value}
            maxLength={CHAT_BOT_THREAD_TITLE_MAX}
            onChange={(event) => field.handleChange(event.target.value)}
          />
        )}
      </form.Field>
      {rename.error ? (
        <p className="text-sm text-destructive">{rename.error.message}</p>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <form.Subscribe selector={(state) => state.canSubmit}>
          {(canSubmit) => (
            <Button type="submit" disabled={rename.isPending || !canSubmit}>
              Save
            </Button>
          )}
        </form.Subscribe>
      </DialogFooter>
    </form>
  );
}

export function ChatBotThreadRenameDialog({
  threadId,
  label,
  open,
  onOpenChange,
}: ChatBotThreadRenameDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename chat</DialogTitle>
          <DialogDescription>
            This name is only a label. Messages stay as they are.
          </DialogDescription>
        </DialogHeader>
        <ChatBotThreadRenameForm
          threadId={threadId}
          label={label}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
