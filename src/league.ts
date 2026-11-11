import { simulateMatch } from "./engine.js";
import { createRng } from "./rng.js";
import type { MatchResult, Team } from "./types.js";

/** Poäng: seger (även i förlängning) 2 p, förlust i förlängning 1 p, förlust i ordinarie tid 0 p. */
const POINTS_WIN = 2;
const POINTS_OTL = 1;

/** En rad i tabellen. */
export interface StandingsRow {
  teamId: string;
  team: string;
  gp: number; // spelade matcher
  w: number; // vinster (inkl. vinster i förlängning)
  l: number; // förluster i ordinarie tid
  otl: number; // förluster i förlängning
  pts: number;
  gf: number; // gjorda mål
  ga: number; // insläppta mål
  gd: number; // målskillnad
}

/** En spelad match i serien. */
export interface GameRecord {
  homeId: string;
  awayId: string;
  homeScore: number;
  awayScore: number;
  overtime: boolean; // true om matchen avgjordes efter 60 minuter
  result: MatchResult; // hela matchen (ordinarie tid, utan förlängningsmålet)
}

export interface LeagueResult {
  seed: number;
  table: StandingsRow[]; // sorterad: poäng > målskillnad > gjorda mål
  games: GameRecord[];
}

/**
 * Spelar en dubbelmötesserie: varje lag möter varje annat lag både hemma och borta.
 * Är matchen oavgjord efter 60 minuter avgörs den i förlängning, som vi förenklar till
 * ett seedat slumpval 50/50. Vinnaren får ett extra mål och en poäng mer än förloraren.
 */
export function simulateSeason(teams: Team[], seed = 2024): LeagueResult {
  if (teams.length < 2) throw new Error("Minst två lag krävs");
  if (new Set(teams.map((t) => t.id)).size !== teams.length) throw new Error("Lagen måste ha unika id");

  const rng = createRng(seed);
  const rows = new Map<string, StandingsRow>(
    teams.map((t) => [t.id, { teamId: t.id, team: t.name, gp: 0, w: 0, l: 0, otl: 0, pts: 0, gf: 0, ga: 0, gd: 0 }]),
  );
  const games: GameRecord[] = [];

  for (const home of teams) {
    for (const away of teams) {
      if (home === away) continue;

      // Varje match får sin egen seed ur säsongens slumpgenerator.
      const result = simulateMatch(home, away, Math.floor(rng() * 2 ** 32));
      let homeScore = result.homeScore;
      let awayScore = result.awayScore;
      const overtime = homeScore === awayScore;
      if (overtime) {
        if (rng() < 0.5) homeScore++;
        else awayScore++;
      }

      games.push({ homeId: home.id, awayId: away.id, homeScore, awayScore, overtime, result });
      record(rows, home.id, homeScore, awayScore, overtime);
      record(rows, away.id, awayScore, homeScore, overtime);
    }
  }

  const table = [...rows.values()].sort(
    (x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || x.team.localeCompare(y.team),
  );
  return { seed, table, games };
}

/** Uppdatera ett lags rad efter en match. */
function record(rows: Map<string, StandingsRow>, id: string, goalsFor: number, goalsAgainst: number, overtime: boolean) {
  const row = rows.get(id);
  if (!row) throw new Error(`Okänt lag ${id}`);
  row.gp++;
  row.gf += goalsFor;
  row.ga += goalsAgainst;
  row.gd = row.gf - row.ga;
  if (goalsFor > goalsAgainst) {
    row.w++;
    row.pts += POINTS_WIN;
  } else if (overtime) {
    row.otl++;
    row.pts += POINTS_OTL;
  } else {
    row.l++;
  }
}

/** Gör tabellen till text. */
export function formatTable(table: StandingsRow[]): string {
  const head = ["#", "Lag".padEnd(14), "GP", " W", " L", "OTL", "PTS", " GF", " GA", "  GD"];
  const lines = [head.join(" ")];
  table.forEach((r, i) => {
    const gd = (r.gd > 0 ? "+" : "") + r.gd;
    lines.push(
      [String(i + 1), r.team.padEnd(14), ...[r.gp, r.w, r.l].map((x) => String(x).padStart(2)), String(r.otl).padStart(3), String(r.pts).padStart(3), String(r.gf).padStart(3), String(r.ga).padStart(3), gd.padStart(4)].join(" "),
    );
  });
  return lines.join("\n");
}
