import { createRng } from "./rng.js";
import type { MatchEvent, MatchResult, Player, Side, Team, TeamStats, TacticalRole } from "./types.js";

const MINUTES = 60;

// Vilken kedja/vilket par som spelar vilken minut (ungefärlig istid: 40/30/20/10 %).
const FORWARD_ROTATION = [0, 1, 0, 2, 1, 0, 3, 1, 0, 2];
const DEFENSE_ROTATION = [0, 1, 0, 2, 1, 0];

/** En spelare på isen tillsammans med sin taktiska roll. */
interface Skater {
  player: Player;
  role: TacticalRole;
}

type Rng = () => number;

const clamp = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x));
const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

/** Hämta element ur en lista, eller kasta fel (i stället för att få `undefined`). */
function at<T>(arr: readonly T[], i: number): T {
  const v = arr[i];
  if (v === undefined) throw new Error(`Index ${i} saknas`);
  return v;
}

function findPlayer(team: Team, id: string): Player {
  const p = team.roster.find((x) => x.id === id);
  if (!p) throw new Error(`Spelare ${id} finns inte i ${team.name}`);
  return p;
}

/** De 5 utespelare som står på isen en viss minut. */
function skatersOnIce(team: Team, minute: number): Skater[] {
  const line = at(team.lineup.lines, at(FORWARD_ROTATION, minute % FORWARD_ROTATION.length));
  const pair = at(team.lineup.pairs, at(DEFENSE_ROTATION, minute % DEFENSE_ROTATION.length));
  return [line.C, line.LW, line.RW, pair.LD, pair.RD].map((a) => ({
    player: findPlayer(team, a.playerId),
    role: a.role,
  }));
}

/** Lagets samlade styrka i kampen om pucken: skating + vision + defense. */
function possessionStrength(skaters: Skater[]): number {
  return avg(skaters.map(({ player: { visible: v } }) => (v.skating + v.vision + v.defense) / 3));
}

/** Välj en skytt; forwards har dubbelt så stor vikt som backar, och skott-attributet väger in. */
function pickShooter(skaters: Skater[], rng: Rng): Skater {
  const weights = skaters.map((s) => s.player.visible.shooting * (s.player.position === "D" ? 0.5 : 1));
  let r = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < skaters.length; i++) {
    r -= at(weights, i);
    if (r <= 0) return at(skaters, i);
  }
  return at(skaters, skaters.length - 1);
}

/** Bästa NetFrontScreen på isen och hans/hennes effekt (0–1), annars undefined. `except` = skytten, som inte kan skymma sitt eget skott. */
function bestScreener(skaters: Skater[], except?: Skater): { skater: Skater; effect: number } | undefined {
  const screeners = skaters
    .filter((s) => s.role === "NetFrontScreen" && s !== except)
    .map((s) => ({ skater: s, effect: (s.player.visible.screening + s.player.visible.physical) / 40 }));
  return screeners.sort((a, b) => b.effect - a.effect)[0];
}

export function simulateMatch(homeTeam: Team, awayTeam: Team, seed = 12345): MatchResult {
  const rng = createRng(seed);
  const teams: Record<Side, Team> = { home: homeTeam, away: awayTeam };
  const stats: Record<Side, TeamStats> = {
    home: { shots: 0, saves: 0, goals: 0 },
    away: { shots: 0, saves: 0, goals: 0 },
  };
  const events: MatchEvent[] = [];

  /** Ett skott mot motståndarmålvakten. Returnerar true om det blev mål. */
  function takeShot(minute: number, side: Side, shooter: Skater, onIce: Skater[], isRebound: boolean): boolean {
    const defSide: Side = side === "home" ? "away" : "home";
    const goalie = findPlayer(teams[defSide], teams[defSide].lineup.goalie);
    const shotQuality = shooter.player.visible.shooting / 20;
    const goalieQuality = avg([goalie.visible.defense, goalie.visible.vision]) / 20;

    // Grundchans ~10 %, justeras av skytt mot målvakt.
    let goalProb = 0.1 + 0.12 * (shotQuality - goalieQuality);
    let screenedNote = "";

    // Bonus: skymd sikt när en NetFrontScreen står framför målvakten.
    const screener = bestScreener(onIce, shooter);
    if (screener && rng() < 0.5 * screener.effect + 0.2) {
      goalProb *= 1 + 0.8 * screener.effect;
      screenedNote = ` (skymd sikt av ${screener.skater.player.name})`;
    }
    if (isRebound) goalProb *= 1.5; // returer är farligare

    stats[side].shots++;
    const scored = rng() < clamp(goalProb, 0.02, 0.6);
    const name = shooter.player.name;
    if (scored) {
      stats[side].goals++;
      events.push({ minute, side, type: "goal", playerId: shooter.player.id, text: `MÅL! ${name} sätter pucken förbi ${goalie.name}${screenedNote}` });
    } else {
      stats[defSide].saves++;
      events.push({ minute, side, type: "save", playerId: shooter.player.id, text: `${goalie.name} räddar skottet från ${name}${screenedNote}` });
    }
    return scored;
  }

  for (let minute = 1; minute <= MINUTES; minute++) {
    const onIce: Record<Side, Skater[]> = {
      home: skatersOnIce(homeTeam, minute),
      away: skatersOnIce(awayTeam, minute),
    };

    // 1. Vem vinner pucken? Styrkan kvadreras så att skillnader märks tydligare.
    const h = possessionStrength(onIce.home) ** 2;
    const a = possessionStrength(onIce.away) ** 2;
    const side: Side = rng() < h / (h + a) ? "home" : "away";
    const defSide: Side = side === "home" ? "away" : "home";
    const attackers = onIce[side];

    // 2. Blir det ett skott? Styrs av vision + skott, motverkas av försvarets defense.
    const offence = avg(attackers.map((s) => (s.player.visible.vision + s.player.visible.shooting) / 2)) / 20;
    const defence = avg(onIce[defSide].map((s) => s.player.visible.defense)) / 20;
    const shotProb = clamp(0.4 + 0.4 * offence - 0.15 * defence, 0.1, 0.9);
    if (rng() >= shotProb) continue;

    // 3. Skott, och ev. retur om en NetFrontScreen står kvar framför mål.
    const shooter = pickShooter(attackers, rng);
    const scored = takeShot(minute, side, shooter, attackers, false);
    const screener = bestScreener(attackers);
    if (!scored && screener && rng() < 0.1 + 0.3 * screener.effect) {
      events.push({ minute, side, type: "rebound", playerId: screener.skater.player.id, text: `Retur! ${screener.skater.player.name} står redo vid målet` });
      takeShot(minute, side, screener.skater, attackers, true);
    }
  }

  return {
    seed,
    homeScore: stats.home.goals,
    awayScore: stats.away.goals,
    stats,
    events,
  };
}
