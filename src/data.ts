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

export interface TeamStats {
  name: string;
  apiName: string | null;
  goalsFor: number;
  goalsAgainst: number;
  matchesPlayed: number;
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
  score?: {
    fullTime?: { home: number | null; away: number | null };
    extraTime?: { home: number | null; away: number | null };
    regularTime?: { home: number | null; away: number | null };
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

    // Prefer extra time, then full time, then regular time.
    let home: number | null = null;
    let away: number | null = null;
    if (score.extraTime?.home != null) {
      home = score.extraTime.home;
      away = score.extraTime.away;
    } else if (score.fullTime?.home != null) {
      home = score.fullTime.home;
      away = score.fullTime.away;
    } else if (score.regularTime?.home != null) {
      home = score.regularTime.home;
      away = score.regularTime.away;
    }
    if (home == null || away == null) continue;

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

  return SPREADSHEET_TEAMS.map((t) => stats[t]);
}
