import { describe, expect, it } from "vitest";
import { simulateMatch } from "./engine.js";
import { ironWolves, northStars } from "./mock.js";
import { formatMatchReport } from "./report.js";

describe("simulateMatch", () => {
  it("spelar en match och loggar matchreferatet", () => {
    const result = simulateMatch(northStars, ironWolves, 42);
    console.log("\n" + formatMatchReport(result, northStars, ironWolves));

    expect(result.events.length).toBeGreaterThan(0);
    for (const e of result.events) {
      expect(e.minute).toBeGreaterThanOrEqual(1);
      expect(e.minute).toBeLessThanOrEqual(60);
    }
  });

  it("är deterministisk: samma seed ger exakt samma match", () => {
    expect(simulateMatch(northStars, ironWolves, 7)).toEqual(simulateMatch(northStars, ironWolves, 7));
  });

  it("olika seeds ger olika matcher", () => {
    expect(simulateMatch(northStars, ironWolves, 1)).not.toEqual(simulateMatch(northStars, ironWolves, 2));
  });

  it("statistiken stämmer med resultatet", () => {
    const r = simulateMatch(northStars, ironWolves, 99);
    const goals = (side: string) => r.events.filter((e) => e.type === "goal" && e.side === side).length;
    expect(goals("home")).toBe(r.homeScore);
    expect(goals("away")).toBe(r.awayScore);
    // Varje skott är antingen mål eller räddning.
    expect(r.stats.home.shots).toBe(r.homeScore + r.stats.away.saves);
    expect(r.stats.away.shots).toBe(r.awayScore + r.stats.home.saves);
  });
});

describe("utvisningar och powerplay", () => {
  const matches = Array.from({ length: 300 }, (_, i) => simulateMatch(northStars, ironWolves, i + 1));

  it("utvisningar förekommer och stämmer med statistiken", () => {
    const penaltyEvents = matches.flatMap((m) => m.events.filter((e) => e.type === "penalty"));
    expect(penaltyEvents.length).toBeGreaterThan(0);
    const statSum = matches.reduce((s, m) => s + m.stats.home.penalties + m.stats.away.penalties, 0);
    expect(statSum).toBe(penaltyEvents.length);
    // Ungefär 2 utvisningar per match (60 minuter * ~4 %, minus tiden med pågående utvisning).
    const perMatch = penaltyEvents.length / matches.length;
    expect(perMatch).toBeGreaterThan(1);
    expect(perMatch).toBeLessThan(4);
  });

  it("PP-mål räknas och är flaggade; PP-mål är en del av lagets mål", () => {
    for (const m of matches) {
      for (const side of ["home", "away"] as const) {
        const pp = m.events.filter((e) => e.type === "goal" && e.side === side && e.powerplay).length;
        expect(m.stats[side].ppGoals).toBe(pp);
        expect(m.stats[side].ppGoals).toBeLessThanOrEqual(m.stats[side].goals);
      }
    }
  });

  it("en utvisning ger aldrig PP-mål utan föregående utvisning, och inga PP-händelser saknar utvisning", () => {
    for (const m of matches) {
      const first = m.events.find((e) => e.powerplay);
      if (!first) continue;
      const earlier = m.events.some((e) => e.type === "penalty" && e.minute < first.minute);
      expect(earlier).toBe(true);
    }
  });

  it("laget i överläge skjuter klart oftare per minut än vid lika antal", () => {
    let ppShots = 0, ppGoals = 0, penalties = 0, evenShots = 0;
    for (const m of matches) {
      const shots = m.events.filter((e) => e.type === "goal" || e.type === "save");
      ppShots += shots.filter((e) => e.powerplay).length;
      ppGoals += shots.filter((e) => e.powerplay && e.type === "goal").length;
      evenShots += shots.filter((e) => !e.powerplay).length;
      penalties += m.events.filter((e) => e.type === "penalty").length;
    }
    // Varje utvisning ger 2 PP-minuter; ett PP-mål avbryter ungefär en minut i förtid.
    const ppMinutes = 2 * penalties - ppGoals;
    const ppRate = ppShots / ppMinutes;
    const evenRatePerTeam = evenShots / (matches.length * 60 * 2);
    expect(ppRate).toBeGreaterThan(1.5 * evenRatePerTeam);
  });

  it("referatet visar utvisningar", () => {
    const m = matches.find((x) => x.stats.home.ppGoals + x.stats.away.ppGoals > 0);
    expect(m).toBeDefined();
    if (!m) return;
    const text = formatMatchReport(m, northStars, ironWolves);
    console.log("\n" + text);
    expect(text).toContain("UTVISNING");
    expect(text).toContain("PP");
  });
});
