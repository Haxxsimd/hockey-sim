import { describe, expect, it } from "vitest";
import { formatTable, simulateSeason } from "./league.js";
import { frostGiants, ironWolves, northStars, polarBears } from "./mock.js";

const teams = [northStars, ironWolves, frostGiants, polarBears];

describe("simulateSeason", () => {
  const season = simulateSeason(teams, 2024);

  it("spelar en dubbelmötesserie och loggar tabellen", () => {
    console.log("\n" + formatTable(season.table));
    expect(season.games).toHaveLength(12); // 4 lag: 4 * 3 matcher
    for (const r of season.table) expect(r.gp).toBe(6);
  });

  it("tabellen går ihop", () => {
    const sum = (f: (r: (typeof season.table)[number]) => number) => season.table.reduce((s, r) => s + f(r), 0);
    expect(sum((r) => r.w)).toBe(12); // en vinnare per match
    expect(sum((r) => r.l + r.otl)).toBe(12); // en förlorare per match
    expect(sum((r) => r.gf)).toBe(sum((r) => r.ga));
    for (const r of season.table) {
      expect(r.gp).toBe(r.w + r.l + r.otl);
      expect(r.pts).toBe(2 * r.w + r.otl);
      expect(r.gd).toBe(r.gf - r.ga);
    }
  });

  it("är sorterad på poäng > målskillnad > gjorda mål", () => {
    for (let i = 1; i < season.table.length; i++) {
      const a = season.table[i - 1]!;
      const b = season.table[i]!;
      const ok = a.pts > b.pts || (a.pts === b.pts && (a.gd > b.gd || (a.gd === b.gd && a.gf >= b.gf)));
      expect(ok).toBe(true);
    }
  });

  it("alla möts hemma och borta exakt en gång", () => {
    const pairs = season.games.map((g) => `${g.homeId}-${g.awayId}`);
    expect(new Set(pairs).size).toBe(12);
    expect(pairs.some((p) => p.split("-")[0] === p.split("-")[1])).toBe(false);
  });

  it("är deterministisk", () => {
    expect(simulateSeason(teams, 2024)).toEqual(season);
  });

  it("avvisar för få lag", () => {
    expect(() => simulateSeason([northStars])).toThrow();
  });
});
