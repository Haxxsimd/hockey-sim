import type { Assignment, Player, Position, Team, TacticalRole } from "./types.js";

/** Hjälpfunktion: skapar en spelare med enkla värden. v = ungefärlig nivå (1–20). */
function p(id: string, name: string, position: Position, v: number, ca: number): Player {
  return {
    id,
    name,
    position,
    hidden: { currentAbility: ca, potentialAbility: Math.min(200, ca + 15), consistency: 12, injuryProneness: 8 },
    visible: { shooting: v, skating: v, vision: v, physical: v, defense: v, screening: v },
  };
}

/** Hjälpfunktion: koppla spelare till roll. */
const a = (playerId: string, role: TacticalRole): Assignment => ({ playerId, role });

export const northStars: Team = {
  id: "ns",
  name: "North Stars",
  roster: [
    p("ns-c1", "Erik Lund", "C", 16, 140), p("ns-lw1", "Jonas Berg", "LW", 15, 135), p("ns-rw1", "Mats Ek", "RW", 15, 132),
    p("ns-c2", "Olof Nyman", "C", 13, 115), p("ns-lw2", "Karl Dahl", "LW", 13, 112), p("ns-rw2", "Nils Sand", "RW", 12, 110),
    p("ns-c3", "Per Holm", "C", 11, 95), p("ns-lw3", "Axel Vik", "LW", 10, 90), p("ns-rw3", "Leif Strand", "RW", 10, 88),
    p("ns-c4", "Tor Ahl", "C", 9, 75), p("ns-lw4", "Bo Rask", "LW", 8, 72), p("ns-rw4", "Gus Falk", "RW", 8, 70),
    p("ns-d1", "Sven Kron", "D", 14, 125), p("ns-d2", "Ulf Brandt", "D", 13, 118),
    p("ns-d3", "Rolf Wik", "D", 11, 98), p("ns-d4", "Lars Mo", "D", 10, 92),
    p("ns-d5", "Ivar Tegn", "D", 8, 74), p("ns-d6", "Hugo Lid", "D", 8, 70),
    p("ns-g1", "Anders Mur", "G", 15, 130), p("ns-g2", "Folke Näs", "G", 9, 80),
  ],
  lineup: {
    goalie: "ns-g1",
    lines: [
      { C: a("ns-c1", "Playmaker"), LW: a("ns-lw1", "Sniper"), RW: a("ns-rw1", "NetFrontScreen") },
      { C: a("ns-c2", "TwoWay"), LW: a("ns-lw2", "Sniper"), RW: a("ns-rw2", "TwoWay") },
      { C: a("ns-c3", "TwoWay"), LW: a("ns-lw3", "TwoWay"), RW: a("ns-rw3", "NetFrontScreen") },
      { C: a("ns-c4", "TwoWay"), LW: a("ns-lw4", "TwoWay"), RW: a("ns-rw4", "TwoWay") },
    ],
    pairs: [
      { LD: a("ns-d1", "OffensiveD"), RD: a("ns-d2", "StayAtHomeD") },
      { LD: a("ns-d3", "StayAtHomeD"), RD: a("ns-d4", "OffensiveD") },
      { LD: a("ns-d5", "StayAtHomeD"), RD: a("ns-d6", "StayAtHomeD") },
    ],
    pp1: {
      C: a("ns-c1", "Playmaker"), LW: a("ns-lw1", "Sniper"), RW: a("ns-rw1", "NetFrontScreen"),
      LD: a("ns-d1", "OffensiveD"), RD: a("ns-d2", "OffensiveD"),
    },
    pk1: {
      C: a("ns-c3", "TwoWay"), W: a("ns-lw3", "TwoWay"),
      LD: a("ns-d3", "StayAtHomeD"), RD: a("ns-d5", "StayAtHomeD"),
    },
  },
};

export const ironWolves: Team = {
  id: "iw",
  name: "Iron Wolves",
  roster: [
    p("iw-c1", "Ville Aho", "C", 15, 138), p("iw-lw1", "Mika Sorsa", "LW", 16, 142), p("iw-rw1", "Teemu Lahti", "RW", 14, 128),
    p("iw-c2", "Jari Koski", "C", 13, 118), p("iw-lw2", "Pekka Ruuth", "LW", 12, 108), p("iw-rw2", "Antti Salo", "RW", 12, 106),
    p("iw-c3", "Eero Mäki", "C", 11, 96), p("iw-lw3", "Kalle Niemi", "LW", 10, 89), p("iw-rw3", "Joni Hirv", "RW", 10, 87),
    p("iw-c4", "Seppo Lind", "C", 9, 76), p("iw-lw4", "Arto Vuori", "LW", 8, 71), p("iw-rw4", "Kimmo Rinne", "RW", 8, 69),
    p("iw-d1", "Matti Kallio", "D", 14, 122), p("iw-d2", "Tapio Heino", "D", 12, 112),
    p("iw-d3", "Risto Parta", "D", 11, 97), p("iw-d4", "Esa Moilan", "D", 10, 91),
    p("iw-d5", "Olli Sipil", "D", 8, 73), p("iw-d6", "Hannu Toiv", "D", 7, 68),
    p("iw-g1", "Janne Virt", "G", 14, 126), p("iw-g2", "Reijo Kaar", "G", 9, 78),
  ],
  lineup: {
    goalie: "iw-g1",
    lines: [
      { C: a("iw-c1", "TwoWay"), LW: a("iw-lw1", "Sniper"), RW: a("iw-rw1", "Playmaker") },
      { C: a("iw-c2", "Playmaker"), LW: a("iw-lw2", "TwoWay"), RW: a("iw-rw2", "NetFrontScreen") },
      { C: a("iw-c3", "TwoWay"), LW: a("iw-lw3", "TwoWay"), RW: a("iw-rw3", "TwoWay") },
      { C: a("iw-c4", "TwoWay"), LW: a("iw-lw4", "NetFrontScreen"), RW: a("iw-rw4", "TwoWay") },
    ],
    pairs: [
      { LD: a("iw-d1", "OffensiveD"), RD: a("iw-d2", "StayAtHomeD") },
      { LD: a("iw-d3", "StayAtHomeD"), RD: a("iw-d4", "StayAtHomeD") },
      { LD: a("iw-d5", "OffensiveD"), RD: a("iw-d6", "StayAtHomeD") },
    ],
    pp1: {
      C: a("iw-c2", "Playmaker"), LW: a("iw-lw1", "Sniper"), RW: a("iw-rw2", "NetFrontScreen"),
      LD: a("iw-d1", "OffensiveD"), RD: a("iw-d5", "OffensiveD"),
    },
    pk1: {
      C: a("iw-c1", "TwoWay"), W: a("iw-lw3", "TwoWay"),
      LD: a("iw-d3", "StayAtHomeD"), RD: a("iw-d4", "StayAtHomeD"),
    },
  },
};
