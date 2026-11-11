import "./style.css";
import { runnerStatus, type RunnerStatus } from "./api";
import { COPY } from "./copy";
import { h } from "./dom";
import { connectedView, offlineView, pairView, stopActivity, topbar, type Tone } from "./views";

const root = document.getElementById("app");
if (!root) throw new Error("#app is missing from index.html");

type Pill = { label: string; tone: Tone };

const pillOf = (status: RunnerStatus | null): Pill => {
  if (!status) return { label: COPY.pill.checking, tone: "info" };
  switch (status.state) {
    case "connected":
      return { label: COPY.pill.connected, tone: "success" };
    case "offline":
      return { label: COPY.pill.offline, tone: "warning" };
    case "unpaired":
    case "revoked":
      return { label: COPY.pill.unpaired, tone: "neutral" };
  }
};

const viewOf = (status: RunnerStatus | null): HTMLElement[] => {
  if (!status) return [];
  switch (status.state) {
    case "connected":
      return connectedView(status, show);
    case "offline":
      return offlineView(refresh);
    case "revoked":
      return pairView(show, COPY.revoked);
    case "unpaired":
      return pairView(show);
  }
};

// Draws the whole window for one status. Only a change of status redraws it; typing in the
// code field and the form's errors update their own elements.
function show(status: RunnerStatus | null): void {
  stopActivity();
  const pill = pillOf(status);
  root?.replaceChildren(topbar(pill.label, pill.tone), h("main", { id: "main" }, ...viewOf(status)));
  document.getElementById("code")?.focus();
}

async function refresh(): Promise<void> {
  show(null);
  show(await runnerStatus());
}

await refresh();

// Coming back to the window asks EliseLAB again, so a runner that was removed meanwhile
// shows as removed, and a lost connection shows as back. A form being typed in is left alone.
window.addEventListener("focus", () => {
  if (!document.getElementById("code")) void refresh();
});
