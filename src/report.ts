import type { MatchEvent, MatchResult, Player, Team } from "./types.js";

// Allt som mallarna kan fylla i. {skytt}, {målvakt} och {screener} byts mot namn.
interface Ctx {
  skytt: string;
  målvakt: string;
  screener: string;
}

// ---------- Textvarianter (mallsträngar) ----------

const SAVE = [
  "Vass räddning! {målvakt} plockar {skytt}s skott med handsken!",
  "{målvakt} styr undan {skytt}s stöt med klubban.",
  "Stabil benparad av {målvakt} på {skytt}s avslut.",
  "{skytt} skjuter, men {målvakt} står rätt och tar pucken på bröstet.",
];

const SAVE_SCREENED = [
  "{screener} parkerar framför kassen och skymmer {målvakt}, men {målvakt} hittar pucken i sista stund och räddar {skytt}s skott!",
  "{skytt} drar iväg ett skott genom trafiken. {screener} står som en mur framför {målvakt}, som ändå lyckas fånga det!",
  "Skymd sikt för {målvakt} när {screener} blockerar synfältet – men benen är snabba och {skytt}s skott räddas.",
  "{screener} trampar i krysset och stör {målvakt}. Skottet från {skytt} studsar ändå på benskyddet!",
];

const REBOUND = [
  "Retur! Pucken ligger och skvalpar och {skytt} hugger direkt i närkampen framför mål!",
  "Kaos framför {målvakt}! {skytt} kämpar sig förbi försvararna och petar åt returen!",
  "{skytt} vinner närkampen vid målet och går på returen med full fart!",
  "Pucken flyter ut och {skytt} är först på plats – klubbor och armbågar flyger framför kassen!",
];

const GOAL_LONG = [
  "MÅL! {skytt} laddar och smäller iväg ett distansskott som {målvakt} aldrig ser!",
  "MÅL! Klockrent handledsskott från blå linjen av {skytt} – {målvakt} hinner inte röra sig!",
  "MÅL! {skytt} sätter ett stenhårt skott i det övre hörnet. {målvakt} chanslös!",
  "MÅL! Distansskott av {skytt} letar sig förbi {målvakt} via stolpen och in!",
];

const GOAL_SCREENED = [
  "MÅL! {screener} står som en fåtölj framför {målvakt} och styr in {skytt}s skott!",
  "MÅL! {målvakt} ser aldrig pucken – {screener} skymmer och {skytt}s skott går in!",
  "MÅL! {screener} drar till med en snygg tippning på {skytt}s skott. {målvakt} står handfallen!",
  "MÅL! Trafik framför kassen – {screener} stör {målvakt} och {skytt} får pucken i nät!",
];

const GOAL_REBOUND = [
  "MÅL på returen! {skytt} hugger till och trycker in pucken förbi {målvakt}!",
  "MÅL! {skytt} vinner kampen framför mål och petar in returen bakom {målvakt}!",
  "MÅL! Returen studsar rakt till {skytt}, som inte missar mot {målvakt}!",
  "MÅL! Skrubbmål! {skytt} kämpar sig fram och skjuter in returen förbi {målvakt}!",
];

const GOAL_REBOUND_SCREENED = [
  "MÅL på returen! {screener} skymmer {målvakt} och {skytt} stämplar in pucken i nät!",
  "MÅL! Kaos framför kassen – {screener} blockerar sikten och {skytt} hugger in returen!",
];

const GOAL_PLAIN = [
  "MÅL! {skytt} blir fri och skjuter iskallt förbi {målvakt}!",
  "MÅL! Fin passningsspelsuppbyggnad slutar med att {skytt} sätter pucken förbi {målvakt}!",
  "MÅL! {skytt} hittar en lucka och dribblar skickligt förbi {målvakt}!",
  "MÅL! {skytt} sätter pucken i mål efter en vass kontring – {målvakt} kommer för sent!",
];

// ---------- Hjälpfunktioner ----------

/** Fyll i en mall: byt ut {nyckel} mot värden ur ctx. */
function fill(template: string, ctx: Ctx): string {
  return template.replace(/\{(skytt|målvakt|screener)\}/g, (_, key: keyof Ctx) => ctx[key]);
}

/**
 * Välj en variant utan att röra simuleringens slumpgenerator.
 * Samma seed + samma händelse ger alltid samma text, så referatet är också deterministiskt.
 */
function pick<T>(variants: readonly T[], seed: number, eventIndex: number, salt: number): T {
  let h = (seed ^ Math.imul(eventIndex + 1, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  const v = variants[h % variants.length];
  if (v === undefined) throw new Error("Tom variantlista");
  return v;
}

/** Beskriv en enskild händelse. */
function describe(e: MatchEvent, i: number, seed: number, lookup: (id: string | undefined) => Player | undefined): string {
  const ctx: Ctx = {
    skytt: lookup(e.playerId)?.name ?? "Okänd",
    målvakt: lookup(e.goalieId)?.name ?? "målvakten",
    screener: lookup(e.screenerId)?.name ?? "en forward",
  };
  const screened = e.screenerId !== undefined;

  switch (e.type) {
    case "save":
      return fill(pick(screened ? SAVE_SCREENED : SAVE, seed, i, 1), ctx);
    case "rebound":
      return fill(pick(REBOUND, seed, i, 2), ctx);
    case "goal": {
      let pool: readonly string[];
      if (e.isRebound) pool = screened ? GOAL_REBOUND_SCREENED : GOAL_REBOUND;
      else if (screened) pool = GOAL_SCREENED;
      else {
        // Utan skymning: backar skjuter från distans, forwards gör vanliga mål.
        const pos = lookup(e.playerId)?.position;
        pool = pos === "D" ? GOAL_LONG : i % 2 === 0 ? GOAL_LONG : GOAL_PLAIN;
      }
      return fill(pick(pool, seed, i, 3), ctx);
    }
  }
}

/** Gör ett MatchResult till läsbar text (presentation hålls borta från motorn). */
export function formatMatchReport(r: MatchResult, home: Team, away: Team): string {
  const teamName = (side: "home" | "away") => (side === "home" ? home.name : away.name);
  const lookup = (id: string | undefined) =>
    id === undefined ? undefined : [...home.roster, ...away.roster].find((p) => p.id === id);

  const lines = [`=== ${home.name} - ${away.name}  ${r.homeScore}-${r.awayScore}  (seed ${r.seed}) ===`, ""];
  r.events.forEach((e, i) => {
    lines.push(`${String(e.minute).padStart(2, "0")}'  [${teamName(e.side)}] ${describe(e, i, r.seed, lookup)}`);
  });
  lines.push("", `Skott:      ${r.stats.home.shots} - ${r.stats.away.shots}`);
  lines.push(`Räddningar: ${r.stats.home.saves} - ${r.stats.away.saves}`);
  return lines.join("\n");
}
