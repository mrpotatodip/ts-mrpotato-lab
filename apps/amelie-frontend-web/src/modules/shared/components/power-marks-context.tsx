import { createContext, useContext, type ReactNode } from "react";

const PowerMarksContext = createContext(false);

type PowerMarksProviderProps = {
  visible: boolean;
  children: ReactNode;
};

// -----
// Whether Power marks draw at all. The dashboard shell sets it
// from who is signed in and what they switched on; outside it,
// no mark shows.
// -----
export function PowerMarksProvider({ visible, children }: PowerMarksProviderProps) {
  return <PowerMarksContext.Provider value={visible}>{children}</PowerMarksContext.Provider>;
}

export function usePowerMarksVisible(): boolean {
  return useContext(PowerMarksContext);
}
