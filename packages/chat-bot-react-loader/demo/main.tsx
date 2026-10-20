import { StrictMode, useEffect, useRef, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { ChatBotProgress, useChatBotProgress, type ChatBotProgressLabels } from "../src";
import "../src/loader.css";
import "./demo.css";
import { SCENARIOS, asChunk, type Scenario } from "./scenarios";

const LABELS: ChatBotProgressLabels = {
  tools: {
    lookupOrder: { busy: "Looking up your order", done: "Found your order" },
    checkStock: { busy: "Checking stock", done: "Checked stock" },
    findCustomer: { busy: "Finding your account", done: "Found your account" },
    applyDiscount: { busy: "Applying the discount", done: "Applied the discount" },
    sendReceipt: { busy: "Sending your receipt", done: "Sent your receipt" },
    refundPayment: { busy: "Refunding", done: "Refunded" },
  },
  subagents: {
    researcher: { busy: "Asking the researcher", done: "Researcher answered" },
    billing: { busy: "Asking billing", done: "Billing answered" },
    auditor: { busy: "Auditing the change", done: "Audit complete" },
  },
};

const STATUS_TONE = { running: "info", waiting: "info", done: "success", failed: "danger" } as const;

function Option({ label, hint, checked, onChange }: { label: string; hint?: ReactNode; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="option">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {label}
        {hint && <span className="option-hint">{hint}</span>}
      </span>
    </label>
  );
}

function Demo() {
  const { state, onChunk, onTurnStart } = useChatBotProgress();
  const [maxVisible, setMaxVisible] = useState(14);
  const [useLabels, setUseLabels] = useState(true);
  const [tree, setTree] = useState(true);
  const [startSounds, setStartSounds] = useState(true);
  const [endSounds, setEndSounds] = useState(true);
  const [playing, setPlaying] = useState<string | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  const stop = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPlaying(null);
  };
  useEffect(() => stop, []);

  const play = (scenario: Scenario) => {
    stop();
    setPlaying(scenario.name);
    setCurrent(scenario.name);
    onTurnStart();
    let at = 0;
    for (const step of scenario.steps) {
      at += step.wait;
      timers.current.push(window.setTimeout(() => onChunk(asChunk(step)), at));
    }
    timers.current.push(window.setTimeout(() => setPlaying(null), at));
  };

  return (
    <main className="page">
      <header className="header">
        <h1>Progress loader</h1>
        <p>
          Preview of <code>@repo/chat-bot-react-loader</code>. Pick a scripted stream and watch the steps, tree lines and sounds.
        </p>
      </header>

      <div className="layout">
        <div className="stack">
          <section className="card">
            <div className="card-header">
              <h2 className="card-title">Scenarios</h2>
            </div>
            <ul className="scenarios">
              {SCENARIOS.map((s) => (
                <li key={s.name}>
                  <button className="scenario" aria-current={current === s.name} disabled={playing === s.name} onClick={() => play(s)}>
                    <span className="scenario-name">{s.name}</span>
                    <span className="scenario-desc">{s.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <div className="card-header">
              <h2 className="card-title">Options</h2>
            </div>
            <div className="options">
              <Option label="Custom labels" hint="Your wording instead of the generic lines" checked={useLabels} onChange={setUseLabels} />
              <Option label="Tree lines" hint="Hang a specialist's rows under its own row" checked={tree} onChange={setTree} />
              <hr />
              <Option label="Start sounds" hint="Ripple as each step starts. Browsers play sound only after a click." checked={startSounds} onChange={setStartSounds} />
              <Option label="End sounds" hint="Petal as each step finishes" checked={endSounds} onChange={setEndSounds} />
              <hr />
              <label className="option option-number">
                <span>
                  Rows shown
                  <span className="option-hint">maxVisible: older rows fold into "earlier steps"</span>
                </span>
                <input type="number" min={1} max={20} value={maxVisible} onChange={(e) => setMaxVisible(Number(e.target.value) || 1)} />
              </label>
            </div>
          </section>
        </div>

        <section className="card sticky">
          <div className="card-header">
            <h2 className="card-title">Preview</h2>
            <span className="badge" data-tone={STATUS_TONE[state.status as keyof typeof STATUS_TONE]}>
              {state.status}
            </span>
          </div>
          <div className="preview-body">
            {state.status === "idle" && <p className="empty">Pick a scenario to start.</p>}
            <ChatBotProgress
              state={state}
              labels={useLabels ? LABELS : undefined}
              maxVisible={maxVisible}
              tree={tree}
              sounds={{ start: startSounds, end: endSounds }}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
);
