import { Volume2, VolumeX } from "lucide-react";

import { Button } from "#/components/ui/button";
import { useChatBotSoundPreference } from "../hooks/use-chat-bot-sound-preference";

// -----
// Mutes or unmutes the sounds the assistant plays as
// its steps start and end. It is a choice of this browser.
// -----
export function ChatBotSoundToggle() {
  const { muted, setMuted } = useChatBotSoundPreference();
  const label = muted ? "Unmute assistant sounds" : "Mute assistant sounds";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-pressed={muted}
      aria-label={label}
      title={label}
      className="opacity-70 hover:opacity-100"
      onClick={() => setMuted(!muted)}
    >
      {muted ? <VolumeX /> : <Volume2 />}
    </Button>
  );
}
