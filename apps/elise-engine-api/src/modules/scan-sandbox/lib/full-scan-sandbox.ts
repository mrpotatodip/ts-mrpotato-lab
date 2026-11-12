import type { ScanPath } from "#/lib/scan-path";
import { ScanSandbox } from "./scan-sandbox";

// -----
// The Sandbox of a full Scan. The same code as the lite one, as its
// own Durable Object class started from its own Image (wrangler.jsonc),
// so a long full Scan never holds a lite Scan's place.
// -----
export class FullScanSandbox extends ScanSandbox {
  protected override get path(): ScanPath {
    return "full";
  }
}
