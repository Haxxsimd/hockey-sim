import { describe, expect, it } from "vitest";
import { frostGiants, ironWolves, northStars, polarBears } from "./mock.js";
import type { Assignment, Team } from "./types.js";

/** Plocka ut alla Assignment-objekt ur en uppställning. */
function allAssignments(t: Team): Assignment[] {
  const { lines, pairs, pp1, pk1 } = t.lineup;
  return [...lines.flatMap((l) => Object.values(l)), ...pairs.flatMap((x) => Object.values(x)), ...Object.values(pp1), ...Object.values(pk1)];
}

describe.each([northStars, ironWolves, frostGiants, polarBears])("mock-lag $name", (team) => {
  it("har 20 spelare med unika id", () => {
    expect(team.roster).toHaveLength(20);
    expect(new Set(team.roster.map((x) => x.id)).size).toBe(20);
  });

  it("alla spelare i uppställningen finns i truppen", () => {
    const ids = new Set(team.roster.map((x) => x.id));
    for (const asg of allAssignments(team)) expect(ids.has(asg.playerId)).toBe(true);
    expect(ids.has(team.lineup.goalie)).toBe(true);
  });

  it("attribut ligger inom giltiga intervall", () => {
    for (const { hidden, visible } of team.roster) {
      expect(hidden.currentAbility).toBeGreaterThanOrEqual(1);
      expect(hidden.potentialAbility).toBeLessThanOrEqual(200);
      expect(hidden.potentialAbility).toBeGreaterThanOrEqual(hidden.currentAbility);
      for (const v of Object.values(visible)) expect(v).toBeGreaterThanOrEqual(1), expect(v).toBeLessThanOrEqual(20);
    }
  });
});
