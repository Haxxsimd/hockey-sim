import type { MatchResult, Team } from "./types.js";

/** Gör ett MatchResult till läsbar text (presentation hålls borta från motorn). */
export function formatMatchReport(r: MatchResult, home: Team, away: Team): string {
  const name = (side: "home" | "away") => (side === "home" ? home.name : away.name);
  const lines = [`=== ${home.name} - ${away.name}  ${r.homeScore}-${r.awayScore}  (seed ${r.seed}) ===`, ""];
  for (const e of r.events) {
    lines.push(`${String(e.minute).padStart(2, "0")}'  [${name(e.side)}] ${e.text}`);
  }
  lines.push("", `Skott:      ${r.stats.home.shots} - ${r.stats.away.shots}`);
  lines.push(`Räddningar: ${r.stats.home.saves} - ${r.stats.away.saves}`);
  return lines.join("\n");
}
