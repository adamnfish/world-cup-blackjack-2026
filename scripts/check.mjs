// Ad-hoc validation: run the real aggregation against captured API data.
// Run: node scripts/check.mjs /tmp/wc.json
import { readFileSync } from "node:fs";
import { aggregateGoals, SPREADSHEET_TEAMS } from "../src/data.ts";

const file = process.argv[2] || "/tmp/wc.json";
const data = JSON.parse(readFileSync(file, "utf8"));
const stats = aggregateGoals(data.matches);

console.log("teams:", stats.length, "(expected 48)");
const unmatched = stats.filter((t) => !t.apiName);
console.log("unmatched:", unmatched.map((t) => t.name).join(", ") || "(none)");

console.log("\nname | apiName | GF | GA | GD | P");
for (const t of stats) {
  console.log(
    `${t.name.padEnd(14)} | ${(t.apiName ?? "?").padEnd(20)} | ${t.goalsFor} | ${t.goalsAgainst} | ${t.goalsFor - t.goalsAgainst} | ${t.matchesPlayed}`
  );
}

const gfRow = stats.map((t) => t.goalsFor).join("\t");
const gdRow = stats.map((t) => t.goalsFor - t.goalsAgainst).join("\t");
console.log("\nGF row values:", gfRow.split("\t").length);
console.log("GF row:", gfRow);
console.log("GD row:", gdRow);

const totalGoals = stats.reduce((n, t) => n + t.goalsFor, 0);
const totalPlayed = stats.reduce((n, t) => n + t.matchesPlayed, 0);
console.log(`\ntotal goals: ${totalGoals}, team-appearances: ${totalPlayed} (=> ${totalPlayed / 2} matches)`);
