import { pairRunner, runnerActivity, unpairRunner, type RunnerStatus } from "./api";
import { COPY } from "./copy";
import { h, logo } from "./dom";

export type Tone = "success" | "danger" | "warning" | "info" | "neutral";

type OnStatus = (status: RunnerStatus) => void;

// -----
// The connected view asks what the runner is doing every few seconds. The timer stops when the
// window draws another view, so a view that is gone never keeps asking.
// -----
const ACTIVITY_EVERY_MS = 3000;
let activityTimer: number | undefined;

// -----
// A failure carries the agent's whole output, which fills a small window. The window shows
// the start of it; the scan's page in Elise has all of it.
// -----
const BRIEF_MAX = 200;
const brief = (text: string) => (text.length > BRIEF_MAX ? `${text.slice(0, BRIEF_MAX).trimEnd()}… The full text is on the scan's page in Elise.` : text);

export const stopActivity = () => {
  if (activityTimer !== undefined) window.clearInterval(activityTimer);
  activityTimer = undefined;
};

export const topbar = (label: string, tone: Tone): HTMLElement =>
  h("header", { class: "topbar" }, logo(), h("span", { class: "brand-name" }, COPY.appName), h("span", { class: `badge tone-${tone}`, role: "status" }, label));

const pageHeader = (title: string, description: string): HTMLElement =>
  h("div", {}, h("h1", { class: "page-title" }, title), h("p", { class: "page-description" }, description));

const cardHeader = (title: string, hint: string): HTMLElement => h("div", { class: "card-header" }, h("h2", { class: "card-title" }, title), h("p", { class: "card-hint" }, hint));

const alert = (tone: Tone, message: string): HTMLElement => h("p", { class: `alert tone-${tone}`, role: tone === "danger" ? "alert" : "note" }, message);

const button = (label: string, variant: "primary" | "outline" | "destructive", type: "button" | "submit" = "button"): HTMLButtonElement =>
  h("button", { class: `btn btn-${variant}`, type }, label);

// -----
// Not paired: one question, one helper line, one error under the field.
// A code that works moves the app to the connected view.
// -----
export const pairView = (onStatus: OnStatus, notice?: string): HTMLElement[] => {
  const input = h("input", {
    id: "code",
    class: "input",
    name: "code",
    type: "text",
    autocomplete: "off",
    autocapitalize: "characters",
    spellcheck: "false",
    maxlength: "14",
    placeholder: COPY.pair.placeholder,
    "aria-describedby": "code-help code-error",
  });
  const error = h("p", { id: "code-error", class: "error", role: "alert" });
  const submit = button(COPY.pair.button, "primary", "submit");

  const showError = (message: string) => {
    error.textContent = message;
    input.setAttribute("aria-invalid", "true");
    input.focus();
  };
  const clearError = () => {
    error.textContent = "";
    input.removeAttribute("aria-invalid");
  };
  const setBusy = (busy: boolean) => {
    submit.disabled = busy;
    submit.textContent = busy ? COPY.pair.busy : COPY.pair.button;
  };

  input.addEventListener("input", clearError);

  const form = h(
    "form",
    { class: "card-content", novalidate: "" },
    h("div", { class: "field" }, h("label", { class: "label", for: "code" }, COPY.pair.label), input, h("p", { id: "code-help", class: "help" }, COPY.pair.help), error),
    h("p", { class: "confirm" }, COPY.pair.confirm),
    h("div", { class: "actions" }, submit),
  );
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const code = input.value.trim();
    if (!code) return showError(COPY.errors.empty);
    setBusy(true);
    const result = await pairRunner(code);
    if (result.ok) return onStatus(result.status);
    setBusy(false);
    showError(COPY.errors[result.code]);
    if (result.code === "invalid_code") input.select();
  });

  return [
    pageHeader(COPY.pair.title, COPY.pair.description),
    ...(notice ? [alert("warning", notice)] : []),
    h("section", { class: "card" }, cardHeader(COPY.pair.cardTitle, COPY.pair.cardHint), form),
  ];
};

// -----
// Paired: who this computer is. Disconnecting asks once, in a sentence, and tells Elise
// before the token is forgotten.
// -----
export const connectedView = (status: Extract<RunnerStatus, { state: "connected" }>, onStatus: OnStatus): HTMLElement[] => {
  const copy = COPY.connected;
  const error = h("p", { class: "error", role: "alert" });
  const actions = h("div", { class: "actions" });
  const confirm = h("p", { class: "confirm" });

  const showActions = () => {
    confirm.textContent = "";
    const disconnect = button(copy.disconnect, "outline");
    disconnect.addEventListener("click", showConfirm);
    actions.replaceChildren(disconnect);
    error.textContent = "";
  };

  const showConfirm = () => {
    confirm.textContent = copy.confirm(status.accountName);
    const proceed = button(copy.confirmButton, "destructive");
    const keep = button(copy.keep, "outline");
    keep.addEventListener("click", showActions);
    proceed.addEventListener("click", async () => {
      proceed.disabled = true;
      keep.disabled = true;
      proceed.textContent = copy.busy;
      const result = await unpairRunner();
      if (result.ok) return onStatus(result.status);
      proceed.disabled = false;
      keep.disabled = false;
      proceed.textContent = copy.confirmButton;
      error.textContent = COPY.disconnectErrors.unreachable;
    });
    actions.replaceChildren(proceed, keep);
    keep.focus();
  };

  showActions();

  const activity = h("p", { class: "alert tone-info", role: "status" });
  const showActivity = async () => {
    const now = await runnerActivity();
    const tone: Tone = now.state === "running" ? "info" : now.state === "finished" && !now.ok ? "danger" : now.state === "finished" ? "success" : "neutral";
    activity.className = `alert tone-${tone}`;
    activity.textContent =
      now.state === "running" ? copy.running(now.repo) : now.state === "finished" ? (now.ok ? copy.finishedOk(now.repo) : copy.finishedFailed(now.repo, brief(now.message))) : copy.idle;
  };
  void showActivity();
  stopActivity();
  activityTimer = window.setInterval(() => void showActivity(), ACTIVITY_EVERY_MS);

  const facts = h(
    "dl",
    { class: "facts" },
    h("div", { class: "fact" }, h("dt", {}, copy.account), h("dd", {}, status.accountName)),
    h("div", { class: "fact" }, h("dt", {}, copy.runner), h("dd", {}, status.name)),
  );
  return [
    pageHeader(copy.title, copy.description(status.accountName)),
    h("section", { class: "card" }, cardHeader(copy.cardTitle, copy.cardHint), h("div", { class: "card-content" }, facts, confirm, error, actions)),
    h("section", { class: "card" }, cardHeader(copy.activityTitle, copy.activityHint), h("div", { class: "card-content" }, activity)),
  ];
};

// -----
// Paired, but Elise did not answer. The pairing is kept, so the way out is to try again.
// -----
export const offlineView = (onRetry: () => void): HTMLElement[] => {
  const retry = button(COPY.offline.retry, "primary");
  retry.addEventListener("click", onRetry);
  return [
    pageHeader(COPY.offline.title, COPY.offline.description),
    h("section", { class: "card" }, cardHeader(COPY.offline.title, COPY.offline.notice), h("div", { class: "card-content" }, h("div", { class: "actions" }, retry))),
  ];
};
