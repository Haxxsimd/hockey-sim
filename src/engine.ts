import { createRng } from "./rng.js";
import type { Assignment, MatchEvent, MatchResult, Player, Side, Team, TeamStats, TacticalRole } from "./types.js";

const MINUTES = 60;

// Utvisningar och powerplay.
const PENALTY_MINUTES = 2;
const PENALTY_BASE_CHANCE = 0.03; // risk per minut för försvarande lag...
const PENALTY_PHYSICAL_CHANCE = 0.02; // ...plus upp till 2 % beroende på lagets physical
const PP_POSSESSION_BOOST = 1.5; // powerplay-lagets styrka i puckkampen (innan kvadrering)
const PP_SHOT_BONUS = 0.2; // extra skottchans för laget i överläge

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

/** Gör en lista platser (Assignment) till spelare på isen. */
function toSkaters(team: Team, assignments: Assignment[]): Skater[] {
  return assignments.map((a) => ({ player: findPlayer(team, a.playerId), role: a.role }));
}

/** De 5 utespelare som står på isen en viss minut (ordinarie kedja + backpar). */
function skatersOnIce(team: Team, minute: number): Skater[] {
  const line = at(team.lineup.lines, at(FORWARD_ROTATION, minute % FORWARD_ROTATION.length));
  const pair = at(team.lineup.pairs, at(DEFENSE_ROTATION, minute % DEFENSE_ROTATION.length));
  return toSkaters(team, [line.C, line.LW, line.RW, pair.LD, pair.RD]);
}

/** Powerplay-enheten (5 utespelare). */
function ppSkaters(team: Team): Skater[] {
  const { C, LW, RW, LD, RD } = team.lineup.pp1;
  return toSkaters(team, [C, LW, RW, LD, RD]);
}

/** Boxplay-enheten (4 utespelare). */
function pkSkaters(team: Team): Skater[] {
  const { C, W, LD, RD } = team.lineup.pk1;
  return toSkaters(team, [C, W, LD, RD]);
}

/** En pågående utvisning: vem som är i överläge och hur många minuter som återstår. */
interface Penalty {
  ppSide: Side;
  remaining: number;
}

/** Lagets samlade styrka i kampen om pucken: skating + vision + defense. */
function possessionStrength(skaters: Skater[]): number {
  return avg(skaters.map(({ player: { visible: v } }) => (v.skating + v.vision + v.defense) / 3));
}

/** Hur mycket en taktisk roll påverkar viljan att skjuta (1 = ingen påverkan). */
const SHOOTING_ROLE_WEIGHT: Partial<Record<TacticalRole, number>> = {
  Sniper: 1.5,
  OffensiveD: 1.5,
  StayAtHomeD: 0.3,
};

/** Välj en skytt: vikten är skott-attributet gånger rollens multiplikator (forwards och backar likställda i övrigt). */
function pickShooter(skaters: Skater[], rng: Rng): Skater {
  const weights = skaters.map((s) => s.player.visible.shooting * (SHOOTING_ROLE_WEIGHT[s.role] ?? 1));
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
    home: { shots: 0, saves: 0, goals: 0, penalties: 0, ppGoals: 0 },
    away: { shots: 0, saves: 0, goals: 0, penalties: 0, ppGoals: 0 },
  };
  const events: MatchEvent[] = [];
  // Bara en utvisning åt gången (ingen 5 mot 3). null = ingen utvisning pågår.
  let penalty: Penalty | null = null;

  /** Ett skott mot motståndarmålvakten. Returnerar true om det blev mål. */
  function takeShot(minute: number, side: Side, shooter: Skater, onIce: Skater[], isRebound: boolean): boolean {
    const defSide: Side = side === "home" ? "away" : "home";
    const goalie = findPlayer(teams[defSide], teams[defSide].lineup.goalie);
    const shotQuality = shooter.player.visible.shooting / 20;
    const goalieQuality = avg([goalie.visible.defense, goalie.visible.vision]) / 20;
    const powerplay = penalty !== null && penalty.ppSide === side;

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
    const extra = {
      isRebound,
      ...(powerplay ? { powerplay } : {}),
      ...(screener && screenedNote ? { screenerId: screener.skater.player.id } : {}),
    };
    if (scored) {
      stats[side].goals++;
      const ppNote = powerplay ? " – powerplay-mål, utvisningen avbryts" : "";
      events.push({ minute, side, type: "goal", playerId: shooter.player.id, goalieId: goalie.id, ...extra, text: `MÅL! ${name} sätter pucken förbi ${goalie.name}${screenedNote}${ppNote}` });
      if (powerplay) {
        stats[side].ppGoals++;
        penalty = null; // PP-mål avbryter utvisningen i förtid
      }
    } else {
      stats[defSide].saves++;
      events.push({ minute, side, type: "save", playerId: shooter.player.id, goalieId: goalie.id, ...extra, text: `${goalie.name} räddar skottet från ${name}${screenedNote}` });
    }
    return scored;
  }

  /** Spela en minut. Returnerar försvarande lag och dess spelare på isen (för utvisningsslumpen). */
  function playMinute(minute: number): { defSide: Side; defenders: Skater[] } {
    const onIce: Record<Side, Skater[]> = {
      home: skatersOnIce(homeTeam, minute),
      away: skatersOnIce(awayTeam, minute),
    };
    // Under utvisning: PP1 mot PK1 i stället för ordinarie femma.
    if (penalty) {
      const pp = penalty.ppSide;
      const pk: Side = pp === "home" ? "away" : "home";
      onIce[pp] = ppSkaters(teams[pp]);
      onIce[pk] = pkSkaters(teams[pk]);
    }
    const ppSide = penalty?.ppSide;

    // 1. Vem vinner pucken? Styrkan kvadreras så att skillnader märks tydligare.
    const boost = (s: Side) => (ppSide === s ? PP_POSSESSION_BOOST : 1);
    const h = (possessionStrength(onIce.home) * boost("home")) ** 2;
    const a = (possessionStrength(onIce.away) * boost("away")) ** 2;
    const side: Side = rng() < h / (h + a) ? "home" : "away";
    const defSide: Side = side === "home" ? "away" : "home";
    const attackers = onIce[side];
    const result = { defSide, defenders: onIce[defSide] };

    // 2. Blir det ett skott? Styrs av vision + skott, motverkas av försvarets defense.
    const offence = avg(attackers.map((s) => (s.player.visible.vision + s.player.visible.shooting) / 2)) / 20;
    const defence = avg(onIce[defSide].map((s) => s.player.visible.defense)) / 20;
    const ppBonus = ppSide === side ? PP_SHOT_BONUS : 0;
    const shotProb = clamp(0.4 + 0.4 * offence - 0.15 * defence + ppBonus, 0.1, 0.9);
    if (rng() >= shotProb) return result;

    // 3. Skott, och ev. retur om en NetFrontScreen står kvar framför mål.
    const shooter = pickShooter(attackers, rng);
    const scored = takeShot(minute, side, shooter, attackers, false);
    const screener = bestScreener(attackers);
    if (!scored && screener && rng() < 0.1 + 0.3 * screener.effect) {
      events.push({ minute, side, type: "rebound", playerId: screener.skater.player.id, ...(ppSide === side ? { powerplay: true } : {}), text: `Retur! ${screener.skater.player.name} står redo vid målet` });
      takeShot(minute, side, screener.skater, attackers, true);
    }
    return result;
  }

  for (let minute = 1; minute <= MINUTES; minute++) {
    const { defSide, defenders } = playMinute(minute);

    if (penalty) {
      // En utvisningsminut är avverkad (om PP-mål inte redan avbrutit den).
      penalty.remaining--;
      if (penalty.remaining <= 0) penalty = null;
    } else if (minute < MINUTES) {
      // Ingen utvisning pågår: risk att försvarande lag drar på sig en. Hög physical ger högre risk.
      const risk = PENALTY_BASE_CHANCE + (PENALTY_PHYSICAL_CHANCE * avg(defenders.map((s) => s.player.visible.physical))) / 20;
      if (rng() < risk) {
        const weights = defenders.map((s) => s.player.visible.physical);
        let r = rng() * weights.reduce((x, y) => x + y, 0);
        let culprit = at(defenders, defenders.length - 1);
        for (let i = 0; i < defenders.length; i++) {
          r -= at(weights, i);
          if (r <= 0) {
            culprit = at(defenders, i);
            break;
          }
        }
        const ppSide: Side = defSide === "home" ? "away" : "home";
        penalty = { ppSide, remaining: PENALTY_MINUTES };
        stats[defSide].penalties++;
        events.push({
          minute,
          side: defSide,
          type: "penalty",
          playerId: culprit.player.id,
          text: `Utvisning! ${culprit.player.name} (${teams[defSide].name}) åker på 2 minuter – ${teams[ppSide].name} i överläge`,
        });
      }
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
