import { createContext, useContext } from "react";

export type ScanLinkMode = "live" | "demo";

export const ScanLinkModeContext = createContext<ScanLinkMode>("live");

export const useScanLinkMode = () => useContext(ScanLinkModeContext);
