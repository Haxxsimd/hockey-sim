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
