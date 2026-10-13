import { ChatBotInput } from "../components/chat-bot-input";
import { ChatBotLayout } from "../components/chat-bot-layout";
import { ChatBotMessage } from "../components/chat-bot-message";
import { ChatBotPartFallback } from "../components/chat-bot-part-fallback";
import { ChatBotStructuredOutputPart } from "../components/chat-bot-structured-output-part";
import { chatBotSubagentComponents } from "../components/chat-bot-subagent";
import { ChatBotTextPart } from "../components/chat-bot-text-part";
import { chatBotUiContext } from "../contexts";

// -----
// The staff chat and the Customer chat differ only
// in the connection they talk through; the screens
// they draw are the same, so both spread these.
// -----
export const chatBotHookParts = {
  context: chatBotUiContext,
  components: {
    layout: ChatBotLayout,
    input: ChatBotInput,
    message: ChatBotMessage,
  },
  partsComponents: {
    text: ChatBotTextPart,
    structuredOutput: ChatBotStructuredOutputPart,
    fallback: ChatBotPartFallback,
  },
  subagentsComponents: chatBotSubagentComponents,
};
