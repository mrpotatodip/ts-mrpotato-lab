import "./style.css";
import { runnerStatus, type PairingOffer, type RunnerStatus } from "./api";
import { COPY } from "./copy";
import { h } from "./dom";
import { acceptView, connectedView, offlineView, pairView, stopActivity, topbar, type Tone } from "./views";

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
      return pairView(showOffer, COPY.revoked);
    case "unpaired":
      return pairView(showOffer);
  }
};

// Draws the whole window for one status. Only a change of status redraws it; typing in the
// code field and the form's errors update their own elements.
let shownKey = "";

function show(status: RunnerStatus | null): void {
  stopActivity();
  shownKey = JSON.stringify(status);
  const pill = pillOf(status);
  root?.replaceChildren(topbar(pill.label, pill.tone), h("main", { id: "main" }, ...viewOf(status)));
  document.getElementById("code")?.focus();
}

// -----
// A code worked: the window asks whether to join that account. The token is held by Rust and
// nothing is saved until the person accepts, so this window is not redrawn by `recheck`.
// -----
const OFFER_KEY = "offer";

function showOffer(offer: PairingOffer): void {
  stopActivity();
  shownKey = OFFER_KEY;
  root?.replaceChildren(topbar(COPY.pill.confirming, "warning"), h("main", { id: "main" }, ...acceptView(offer, show)));
}

async function refresh(): Promise<void> {
  show(null);
  show(await runnerStatus());
}

// -----
// Coming back to the window asks Elise again, so a runner that was removed meanwhile
// shows as removed, and a lost connection shows as back. The window is drawn again only when
// the answer changed, so it does not flash and an open "Disconnect" question stays open.
// A form being typed in is left alone.
// -----
async function recheck(): Promise<void> {
  if (shownKey === OFFER_KEY) return;
  const next = await runnerStatus();
  if (shownKey === OFFER_KEY) return;
  if (JSON.stringify(next) !== shownKey) show(next);
}

await refresh();

window.addEventListener("focus", () => {
  if (!document.getElementById("code")) void recheck();
});
