import { Avatar, Bar, Row, Stage, Text, Window } from "./kit";
import "./card.css";

// The dashboard's Scans screen as a still card: pinned top-left, running off
// the right and bottom, one finding card straddling the sidebar edge. The
// repositories and findings are made up for the picture (the page says so).

const ROWS: { selected?: boolean; owner?: string; name?: string | number }[] = [
  { owner: "acme/", name: "web-app" },
  { selected: true },
  { owner: "acme/", name: "docs-site" },
  { name: 84 },
  { name: 64 },
  { name: 78 },
];
const NAV = ["Overview", "Repositories", "Scans", "Files"];
const FINDINGS = [
  { title: "Open redirect", tone: "high" },
  { title: "Token in logs", tone: "medium" },
  { title: "No rate limit", tone: "low" },
];

export default function ScansCard() {
  return (
    <Stage width={400} height={300} compact={{ below: 400, width: 358, height: 300 }} className="ed-card">
      {() => (
        <>
          <Window url="app.eliselab.com" className="ed-window">
            <aside className="ed-sidebar">
              <Bar w={20} h={20} r={6} tone={4} style={{ marginBottom: 10 }} />
              {NAV.map((label, i) => (
                <div key={label} className="ed-nav" data-on={i === 2 || undefined}>
                  <Bar w={10} h={10} r={3} tone={i === 2 ? 4 : 3} />
                  <Text className="ed-nav__label">{label}</Text>
                </div>
              ))}
            </aside>
            <div className="ed-main">
              <div className="ed-header">
                <Text className="ed-title">Scans</Text>
                <Bar w={52} h={22} r={6} tone={2} />
              </div>
              <div className="ed-list">
                {ROWS.map((row, i) =>
                  row.selected ? (
                    <Row key={i} pad={0} selected className="ed-row" data-target="selected" lead={<Avatar name="Billing API" tone="accent" size={18} />} title={<><Text className="ed-name ed-owner">acme/</Text><Text className="ed-name">billing-api</Text></>} />
                  ) : (
                    <Row key={i} pad={0} className="ed-row" lead={<Bar w={18} h={18} r={9} tone={2} />} title={typeof row.name === "string" ? <><Text className="ed-rowname ed-owner">{row.owner ?? ""}</Text><Text className="ed-rowname">{row.name}</Text></> : <Bar w={row.name ?? 60} tone={3} />} />
                  ),
                )}
              </div>
            </div>
          </Window>

          <div className="ed-detail">
            <div className="ed-detail-head">
              <Text className="ed-detail-name">3 findings</Text>
              <Text className="ed-detail-sub">acme/billing-api</Text>
            </div>
            {FINDINGS.map((f) => (
              <div key={f.tone} className="ed-finding">
                <Text className="ed-finding-title">{f.title}</Text>
                <span className="ed-dot" data-tone={f.tone} />
              </div>
            ))}
          </div>
        </>
      )}
    </Stage>
  );
}
