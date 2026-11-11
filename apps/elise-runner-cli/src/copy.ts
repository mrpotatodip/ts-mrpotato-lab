import type { RunnerErrorCode } from "./api";

// Every word the person reads. Questions for labels, one line of help before the mistake,
// errors that say how to fix it, buttons that name the action (DESIGN.md "Form copy").
export const COPY = {
  appName: "EliseLAB Runner",
  pill: {
    checking: "Checking",
    unpaired: "Not paired",
    connected: "Connected",
    offline: "Can't reach EliseLAB",
  },
  pair: {
    title: "Connect this computer",
    description: "Pair it with your EliseLAB account so it can run scans.",
    cardTitle: "Pair with a code",
    cardHint: "Add a runner in EliseLAB to get a code.",
    label: "What is your pairing code?",
    placeholder: "XXXX-XXXX",
    help: "It looks like K7QM-4TXD. A code works once and expires after 10 minutes.",
    confirm: "This connects this computer to the account that made the code.",
    button: "Pair this computer",
    busy: "Pairing…",
  },
  revoked: "EliseLAB removed this computer. Pair it again with a new code.",
  connected: {
    title: "This computer is connected",
    description: (accountName: string) => `It is paired with ${accountName}.`,
    cardTitle: "Connection",
    cardHint: "What EliseLAB knows about this computer.",
    account: "Account",
    runner: "Runner name",
    notice: "Pairing is done. Running scans on this computer is not turned on yet.",
    disconnect: "Disconnect this computer",
    confirm: (accountName: string) => `This computer stops being a runner for ${accountName}. To use it again, pair it with a new code.`,
    confirmButton: "Disconnect",
    keep: "Keep connected",
    busy: "Disconnecting…",
  },
  offline: {
    title: "Can't reach EliseLAB",
    description: "This computer is still paired.",
    notice: "Check your internet connection, then try again.",
    retry: "Try again",
  },
  errors: {
    empty: "Enter the pairing code from EliseLAB.",
    invalid_code: "That code didn't work. Check it, or make a new one in EliseLAB: a code works once and expires after 10 minutes.",
    unreachable: "Couldn't reach EliseLAB. Check your internet connection and try again.",
    keychain_failed: "The code worked, but this computer would not save the connection. Make a new code in EliseLAB and try again.",
  } satisfies Record<RunnerErrorCode | "empty", string>,
  disconnectErrors: {
    unreachable: "Couldn't reach EliseLAB to disconnect. Check your internet connection and try again.",
  },
} as const;
