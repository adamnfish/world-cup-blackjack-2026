import { useEffect, useMemo, useState } from "react";
import {
  aggregateGoals,
  SPREADSHEET_TEAMS,
  TEAM_FLAGS,
  teamProgress,
  type TeamStats,
} from "./data";

/** A single data row. "all" stacks every RowMode into one paste. */
type RowMode = "gf" | "gd" | "progress" | "status";
type OutputMode = "all" | RowMode;

/** Row order for the "all" export — matches the tab order. */
const ALL_MODES: RowMode[] = ["gf", "gd", "progress", "status"];

const ROW_LABEL: Record<OutputMode, string> = {
  all: "All",
  gf: "GF",
  gd: "GD",
  progress: "Progress",
  status: "Status",
};

/** The spreadsheet cell value for one team in a given row mode. */
function cellFor(t: TeamStats, mode: RowMode): string {
  switch (mode) {
    case "gd":
      return (t.goalsFor - t.goalsAgainst).toString();
    case "progress":
      return progressCell(t);
    case "status":
      return statusCell(t);
    case "gf":
      return t.goalsFor.toString();
  }
}

const LS_TOKEN = "wc26_api_token";
const LS_PROXY = "wc26_proxy_url";

const emptyStats = (): TeamStats[] =>
  SPREADSHEET_TEAMS.map((name) => ({
    name,
    apiName: null,
    goalsFor: 0,
    goalsAgainst: 0,
    matchesPlayed: 0,
    stageCode: null,
    groupPlayed: 0,
    eliminated: false,
    rank: null,
  }));

const MEDALS: Record<1 | 2 | 3, string> = { 1: "🏆", 2: "🥈", 3: "🥉" };
const PODIUM_TITLE: Record<1 | 2 | 3, string> = {
  1: "Champion",
  2: "Runner-up",
  3: "Third place",
};
const ROUND_NAME: Record<string, string> = {
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarter-finals",
  SF: "Semi-finals",
  F: "Final",
};

/** The progress badge shown in the top-right of each team card. */
function ProgressBadge({ team }: { team: TeamStats }) {
  const p = teamProgress(team);
  switch (p.kind) {
    case "none":
      return null;
    case "group":
      return (
        <span
          className={`badge group ${p.alive ? "" : "out"}`}
          title={`Group stage — ${p.played} of 3 played${p.alive ? "" : " (eliminated)"}`}
        >
          G<span className="count-chip">{p.played}</span>
        </span>
      );
    case "round": {
      const name = ROUND_NAME[p.code] ?? p.code;
      return (
        <span
          className={`badge ${p.alive ? "alive" : "out"}`}
          title={p.alive ? name : `Eliminated — ${name}`}
        >
          {p.code}
        </span>
      );
    }
    case "podium":
      return (
        <span className={`badge podium rank${p.rank}`} title={PODIUM_TITLE[p.rank]}>
          {MEDALS[p.rank]}
        </span>
      );
  }
}

/** Spreadsheet text mirroring the progress badge. */
function progressCell(t: TeamStats): string {
  const p = teamProgress(t);
  switch (p.kind) {
    case "none":
      return ""; // no matches played yet -> blank cell
    case "group":
      return `G${p.played}`; // e.g. G2
    case "round":
      return p.code; // R32 / R16 / QF / SF / F
    case "podium":
      return MEDALS[p.rank]; // 🏆 / 🥈 / 🥉
  }
}

/** In/out marker for the status row. */
function statusCell(t: TeamStats): string {
  return t.eliminated ? "❌" : "⚽";
}

export function App() {
  const [apiToken, setApiToken] = useState(
    () => localStorage.getItem(LS_TOKEN) ?? ""
  );
  const [proxyUrl, setProxyUrl] = useState(
    () =>
      localStorage.getItem(LS_PROXY) ??
      (import.meta.env.VITE_PROXY_URL as string | undefined) ??
      ""
  );
  const [stats, setStats] = useState<TeamStats[]>(emptyStats);
  const [mode, setMode] = useState<OutputMode>("all");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    kind: "info" | "error" | "success";
    text: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => localStorage.setItem(LS_TOKEN, apiToken), [apiToken]);
  useEffect(() => localStorage.setItem(LS_PROXY, proxyUrl), [proxyUrl]);

  const tsvRow = useMemo(() => {
    const modes = mode === "all" ? ALL_MODES : [mode];
    return modes
      .map((m) => stats.map((t) => cellFor(t, m)).join("\t"))
      .join("\n");
  }, [stats, mode]);

  const loaded = stats.some((t) => t.matchesPlayed > 0);

  async function loadStats() {
    if (!apiToken.trim()) {
      setStatus({ kind: "error", text: "Paste your football-data.org API token first." });
      return;
    }
    if (!proxyUrl.trim()) {
      setStatus({
        kind: "error",
        text: "Set your proxy URL first (see the README for the Cloudflare Worker setup).",
      });
      return;
    }

    setLoading(true);
    setStatus({ kind: "info", text: "Loading match data…" });
    try {
      const base = proxyUrl.trim().replace(/\/+$/, "");
      const res = await fetch(`${base}/v4/competitions/WC/matches`, {
        headers: { "X-Auth-Token": apiToken.trim() },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Feed returned ${res.status}. ${body.slice(0, 200)}`);
      }
      const data = await res.json();
      if (!data || !Array.isArray(data.matches)) {
        throw new Error("Response did not contain a 'matches' array.");
      }
      const aggregated = aggregateGoals(data.matches);
      setStats(aggregated);

      const unmatched = aggregated.filter((t) => !t.apiName).map((t) => t.name);
      if (unmatched.length) {
        setStatus({
          kind: "error",
          text: `Loaded, but couldn't match: ${unmatched.join(", ")}. Check these manually.`,
        });
      } else {
        const played = aggregated.reduce((n, t) => n + t.matchesPlayed, 0) / 2;
        setStatus({ kind: "success", text: `Loaded stats from ${played} matches.` });
      }
    } catch (err) {
      setStatus({
        kind: "error",
        text: `Failed to load: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setLoading(false);
    }
  }

  async function copyRow() {
    try {
      await navigator.clipboard.writeText(tsvRow);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setStatus({ kind: "error", text: "Clipboard blocked — select the row and copy manually." });
    }
  }

  return (
    <>
      <div className="brandstrip" aria-hidden="true" />
      <div className="app">
      <header className="bar">
        <h1>
          World Cup 2026 <span>Blackjack Stats</span>
        </h1>
        <div className="controls">
          <input
            type="password"
            placeholder="football-data.org API token"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            autoComplete="off"
          />
          <input
            type="text"
            placeholder="Proxy URL (your Worker)"
            value={proxyUrl}
            onChange={(e) => setProxyUrl(e.target.value)}
            autoComplete="off"
          />
          <button className="primary" onClick={loadStats} disabled={loading}>
            {loading ? "Loading…" : "Load stats"}
          </button>
        </div>
      </header>

      {status && <div className={`status ${status.kind}`}>{status.text}</div>}

      <section className="output">
        <div className="output-head">
          <div className="toggle">
            <button
              className={mode === "all" ? "on" : ""}
              onClick={() => setMode("all")}
            >
              All
            </button>
            <button
              className={mode === "gf" ? "on" : ""}
              onClick={() => setMode("gf")}
            >
              Goals For
            </button>
            <button
              className={mode === "gd" ? "on" : ""}
              onClick={() => setMode("gd")}
            >
              Goal Difference
            </button>
            <button
              className={mode === "progress" ? "on" : ""}
              onClick={() => setMode("progress")}
            >
              Progress
            </button>
            <button
              className={mode === "status" ? "on" : ""}
              onClick={() => setMode("status")}
            >
              Status
            </button>
          </div>
          <button className="copy" onClick={copyRow}>
            {copied
              ? "Copied!"
              : `Copy ${ROW_LABEL[mode]} row${mode === "all" ? "s" : ""}`}
          </button>
        </div>
        <pre className="tsv" title="Click to select, then copy">
          {tsvRow}
        </pre>
        <p className="hint">
          {mode === "all"
            ? "Tab-separated, 4 rows (GF, GD, Progress, Status) × 48 values in spreadsheet order. Paste straight into the block."
            : "Tab-separated, 48 values in spreadsheet order. Paste straight into the row."}
        </p>
      </section>

      <main className="grid">
        {stats.map((t) => {
          const gd = t.goalsFor - t.goalsAgainst;
          const sign = gd > 0 ? "pos" : gd < 0 ? "neg" : "";
          return (
            <div
              key={t.name}
              className={`cell ${!t.apiName && loaded ? "unmatched" : ""}`}
            >
              <div className="cell-head">
                <span className="flag" aria-hidden="true">
                  {TEAM_FLAGS[t.name] ?? ""}
                </span>
                <span
                  className={`team ${t.eliminated ? "elim" : ""}`}
                  title={t.apiName ?? "no API match"}
                >
                  {t.name}
                </span>
                <ProgressBadge team={t} />
              </div>
              <div className="nums">
                <span className={`num ${mode === "gf" ? "hot" : ""}`}>
                  <em>GF</em>
                  {t.goalsFor}
                </span>
                <span className="num">
                  <em>GA</em>
                  {t.goalsAgainst}
                </span>
                <span
                  className={`num gd ${sign} ${mode === "gd" ? "hot" : ""}`}
                >
                  <em>GD</em>
                  {gd > 0 ? `+${gd}` : gd}
                </span>
              </div>
            </div>
          );
        })}
      </main>
      </div>
    </>
  );
}
