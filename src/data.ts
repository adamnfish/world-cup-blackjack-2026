// The 48 World Cup teams in the EXACT order they appear in the spreadsheet row.
// This order is essential: the generated TSV must line up column-for-column with
// the teams in the sheet, so do not reorder or sort this list.
export const SPREADSHEET_TEAMS = [
  "Mexico",
  "S. Africa",
  "S. Korea",
  "Czechia",
  "Canada",
  "Bosnia & H.",
  "Qatar",
  "Switzerland",
  "Brazil",
  "Morocco",
  "Haiti",
  "Scotland",
  "USA",
  "Paraguay",
  "Australia",
  "Türkiye",
  "Germany",
  "Curaçao",
  "Côte d'Ivoire",
  "Ecuador",
  "Netherlands",
  "Japan",
  "Sweden",
  "Tunisia",
  "Belgium",
  "Egypt",
  "Iran",
  "New Zealand",
  "Spain",
  "Cape Verde",
  "Saudi Arabia",
  "Uruguay",
  "France",
  "Senegal",
  "Iraq",
  "Norway",
  "Argentina",
  "Algeria",
  "Austria",
  "Jordan",
  "Portugal",
  "DR Congo",
  "Uzbekistan",
  "Colombia",
  "England",
  "Croatia",
  "Ghana",
  "Panama",
] as const;

// Flag emoji for each team, keyed by spreadsheet name. Scotland and England
// use the GB subdivision tag sequences.
export const TEAM_FLAGS: Record<string, string> = {
  Mexico: "🇲🇽",
  "S. Africa": "🇿🇦",
  "S. Korea": "🇰🇷",
  Czechia: "🇨🇿",
  Canada: "🇨🇦",
  "Bosnia & H.": "🇧🇦",
  Qatar: "🇶🇦",
  Switzerland: "🇨🇭",
  Brazil: "🇧🇷",
  Morocco: "🇲🇦",
  Haiti: "🇭🇹",
  Scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  USA: "🇺🇸",
  Paraguay: "🇵🇾",
  Australia: "🇦🇺",
  Türkiye: "🇹🇷",
  Germany: "🇩🇪",
  Curaçao: "🇨🇼",
  "Côte d'Ivoire": "🇨🇮",
  Ecuador: "🇪🇨",
  Netherlands: "🇳🇱",
  Japan: "🇯🇵",
  Sweden: "🇸🇪",
  Tunisia: "🇹🇳",
  Belgium: "🇧🇪",
  Egypt: "🇪🇬",
  Iran: "🇮🇷",
  "New Zealand": "🇳🇿",
  Spain: "🇪🇸",
  "Cape Verde": "🇨🇻",
  "Saudi Arabia": "🇸🇦",
  Uruguay: "🇺🇾",
  France: "🇫🇷",
  Senegal: "🇸🇳",
  Iraq: "🇮🇶",
  Norway: "🇳🇴",
  Argentina: "🇦🇷",
  Algeria: "🇩🇿",
  Austria: "🇦🇹",
  Jordan: "🇯🇴",
  Portugal: "🇵🇹",
  "DR Congo": "🇨🇩",
  Uzbekistan: "🇺🇿",
  Colombia: "🇨🇴",
  England: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  Croatia: "🇭🇷",
  Ghana: "🇬🇭",
  Panama: "🇵🇦",
};

export interface TeamStats {
  name: string;
  apiName: string | null;
  goalsFor: number;
  goalsAgainst: number;
  matchesPlayed: number;
  /** Badge code for the furthest stage reached (GS/R32/R16/QF/SF/F), or null. */
  stageCode: string | null;
  /** Finished group-stage matches played (0–3), for the group count chip. */
  groupPlayed: number;
  /** Knocked out of the tournament (lost a KO match, or didn't escape the group). */
  eliminated: boolean;
  /** Final standing: 1 champion, 2 runner-up, 3 third place; null otherwise. */
  rank: 1 | 2 | 3 | null;
}

/**
 * football-data.org `stage` enum → { ordering, badge code }. Single source of
 * truth for tournament progress; if the live 2026 feed uses a different string
 * (e.g. for the Round of 32), fix it here and nowhere else.
 *
 * THIRD_PLACE shares SEMI_FINALS' order/code: reaching it means "semi-finalist"
 * (the playoff is a consolation, not an advancement). FINAL shows "F" only while
 * the match is pending — once played, both teams resolve to a medal (rank).
 */
const STAGE: Record<string, { order: number; code: string }> = {
  GROUP_STAGE: { order: 0, code: "GS" },
  LAST_32: { order: 1, code: "R32" },
  LAST_16: { order: 2, code: "R16" },
  QUARTER_FINALS: { order: 3, code: "QF" },
  SEMI_FINALS: { order: 4, code: "SF" },
  THIRD_PLACE: { order: 4, code: "SF" },
  FINAL: { order: 5, code: "F" },
};

/** Stage info for a match, defaulting unknown/missing stages to group treatment. */
function stageInfo(stage?: string): { order: number; code: string } {
  return (stage && STAGE[stage]) || STAGE.GROUP_STAGE;
}

/** A team's tournament progress, shaped for rendering. */
export type Progress =
  | { kind: "none" }
  | { kind: "group"; played: number; alive: boolean }
  | { kind: "round"; code: string; alive: boolean }
  | { kind: "podium"; rank: 1 | 2 | 3 };

/** Derive the display-ready progress for a team. Pure — testable from check.mjs. */
export function teamProgress(t: TeamStats): Progress {
  if (t.rank) return { kind: "podium", rank: t.rank };
  if (t.stageCode == null) return { kind: "none" };
  if (t.stageCode === "GS")
    return { kind: "group", played: t.groupPlayed, alive: !t.eliminated };
  return { kind: "round", code: t.stageCode, alive: !t.eliminated };
}

/** Remove diacritics/accents from a string. */
function removeAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Normalise a team name to a canonical form to make fuzzy matching reliable. */
function cleanString(str: string): string {
  const cleaned = removeAccents(str)
    .toLowerCase()
    .replace(/[.&-]/g, " ") // dots, ampersands, hyphens -> spaces
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();

  // Collapse known name variants onto a single canonical token.
  if (cleaned === "south africa") return "s africa";
  if (cleaned === "south korea" || cleaned === "korea republic") return "s korea";
  if (cleaned === "czech republic") return "czechia";
  if (cleaned === "bosnia and herzegovina" || cleaned === "bosnia herzegovina")
    return "bosnia & h";
  if (
    cleaned === "united states" ||
    cleaned === "united states of america" ||
    cleaned === "us"
  )
    return "usa";
  if (cleaned === "turkey") return "turkiye";
  if (cleaned === "ivory coast") return "cote d'ivoire";
  if (cleaned === "congo dr" || cleaned === "democratic republic of the congo")
    return "dr congo";
  if (cleaned === "cabo verde") return "cape verde";

  return cleaned;
}

/** Fuzzy-match a spreadsheet team name against the list of API team names. */
function findBestTeamMatch(
  spreadsheetName: string,
  apiTeamNames: string[]
): string | null {
  const target = cleanString(spreadsheetName);

  // 1. Exact match on the cleaned form.
  for (const apiName of apiTeamNames) {
    if (cleanString(apiName) === target) return apiName;
  }

  // 2. One name contains the other (e.g. "Cape Verde" vs "Cape Verde Islands").
  for (const apiName of apiTeamNames) {
    const clean = cleanString(apiName);
    if (clean.includes(target) || target.includes(clean)) return apiName;
  }

  // 3. Share at least one meaningful word token.
  const targetTokens = target.split(" ").filter((t) => t.length > 2);
  if (targetTokens.length > 0) {
    for (const apiName of apiTeamNames) {
      const apiTokens = cleanString(apiName)
        .split(" ")
        .filter((t) => t.length > 2);
      if (targetTokens.some((tok) => apiTokens.includes(tok))) return apiName;
    }
  }

  return null;
}

interface ApiMatch {
  status?: string;
  stage?: string;
  score?: {
    winner?: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    fullTime?: { home: number | null; away: number | null };
    extraTime?: { home: number | null; away: number | null };
    regularTime?: { home: number | null; away: number | null };
    penalties?: { home: number | null; away: number | null };
  };
  homeTeam?: { name?: string };
  awayTeam?: { name?: string };
}

/**
 * Aggregate goals scored/conceded per team from football-data.org match data,
 * returning one entry per spreadsheet team in spreadsheet order.
 *
 * Goals include extra time but exclude penalty shootouts (football-data.org
 * keeps shootout results out of the fullTime/extraTime score objects).
 */
export function aggregateGoals(matches: ApiMatch[]): TeamStats[] {
  // Collect every team name the API mentions, to build the name mapping.
  const apiNames = new Set<string>();
  for (const m of matches) {
    if (m.homeTeam?.name) apiNames.add(m.homeTeam.name);
    if (m.awayTeam?.name) apiNames.add(m.awayTeam.name);
  }
  const apiNameList = [...apiNames];

  const stats: Record<string, TeamStats> = {};
  for (const team of SPREADSHEET_TEAMS) {
    stats[team] = {
      name: team,
      apiName: findBestTeamMatch(team, apiNameList),
      goalsFor: 0,
      goalsAgainst: 0,
      matchesPlayed: 0,
      stageCode: null,
      groupPlayed: 0,
      eliminated: false,
      rank: null,
    };
  }

  // Map an API team name back to its spreadsheet team, via the precomputed
  // mapping first, then a direct cleaned comparison as a fallback.
  const teamByApiName = (apiName: string): TeamStats | undefined => {
    return (
      SPREADSHEET_TEAMS.map((t) => stats[t]).find((s) => s.apiName === apiName) ??
      SPREADSHEET_TEAMS.map((t) => stats[t]).find(
        (s) => cleanString(s.name) === cleanString(apiName)
      )
    );
  };

  for (const m of matches) {
    const score = m.score;
    if (!score || !m.homeTeam?.name || !m.awayTeam?.name) continue;

    const played =
      m.status === "FINISHED" ||
      m.status === "IN_PLAY" ||
      m.status === "PAUSED" ||
      score.fullTime?.home != null ||
      score.extraTime?.home != null;
    if (!played) continue;

    // Sum regularTime + extraTime to get in-play goals, deliberately excluding
    // penalty shootout goals. Both fields are period-specific deltas: regularTime
    // covers the 90 minutes and extraTime covers the additional 30 minutes.
    // Missing fields fall back to 0, giving a consistent result regardless of
    // how far the match progressed.
    const home = (score.regularTime?.home ?? 0) + (score.extraTime?.home ?? 0);
    const away = (score.regularTime?.away ?? 0) + (score.extraTime?.away ?? 0);
    // Skip matches with no score data at all (scheduled/postponed). A genuine
    // 0-0 draw will have regularTime.home === 0, so it won't be skipped.
    if (home === 0 && away === 0 && score.regularTime?.home == null) continue;

    const homeTeam = teamByApiName(m.homeTeam.name);
    const awayTeam = teamByApiName(m.awayTeam.name);

    if (homeTeam) {
      homeTeam.goalsFor += home;
      homeTeam.goalsAgainst += away;
      homeTeam.matchesPlayed += 1;
    }
    if (awayTeam) {
      awayTeam.goalsFor += away;
      awayTeam.goalsAgainst += home;
      awayTeam.matchesPlayed += 1;
    }
  }

  // ---- Tournament progress / status ----
  // Highest stage order each team appears in (any status); -1 = no matches.
  const highestOrder: Record<string, number> = {};
  for (const team of SPREADSHEET_TEAMS) highestOrder[team] = -1;
  let knockoutsBegun = false;

  for (const m of matches) {
    if (!m.homeTeam?.name || !m.awayTeam?.name) continue;
    const homeTeam = teamByApiName(m.homeTeam.name);
    const awayTeam = teamByApiName(m.awayTeam.name);
    if (!homeTeam && !awayTeam) continue;

    const { order, code } = stageInfo(m.stage);
    const finished = m.status === "FINISHED";
    if (order >= 1) knockoutsBegun = true;

    // Record the furthest stage each team appears in.
    for (const t of [homeTeam, awayTeam]) {
      if (t && order > highestOrder[t.name]) {
        highestOrder[t.name] = order;
        t.stageCode = code;
      }
    }

    // Count finished group matches for the count chip.
    if (order === 0 && finished) {
      if (homeTeam) homeTeam.groupPlayed += 1;
      if (awayTeam) awayTeam.groupPlayed += 1;
    }

    if (order < 1 || !finished) continue;

    // Knockout result. Trust score.winner; fall back to the shootout score
    // (knockouts can't truly draw) so penalty winners are handled correctly.
    let winnerSide = m.score?.winner ?? null;
    const pens = m.score?.penalties;
    if (
      (winnerSide == null || winnerSide === "DRAW") &&
      pens?.home != null &&
      pens.away != null &&
      pens.home !== pens.away
    ) {
      winnerSide = pens.home > pens.away ? "HOME_TEAM" : "AWAY_TEAM";
    }
    const winner =
      winnerSide === "HOME_TEAM" ? homeTeam : winnerSide === "AWAY_TEAM" ? awayTeam : null;
    const loser =
      winnerSide === "HOME_TEAM" ? awayTeam : winnerSide === "AWAY_TEAM" ? homeTeam : null;

    if (m.stage === "FINAL") {
      if (winner) winner.rank = 1;
      if (loser) loser.rank = 2;
    } else if (m.stage === "THIRD_PLACE") {
      if (winner) winner.rank = 3;
      if (loser) loser.eliminated = true;
    } else if (loser) {
      loser.eliminated = true;
    }
  }

  // Once the knockouts have a real fixture, any team that never reached one was
  // eliminated in the group stage.
  if (knockoutsBegun) {
    for (const team of SPREADSHEET_TEAMS) {
      if (highestOrder[team] <= 0) stats[team].eliminated = true;
    }
  }

  return SPREADSHEET_TEAMS.map((t) => stats[t]);
}
