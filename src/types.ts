// Kärndatamodell för hockeysimuleringen. Bara typer – ingen logik här.

// ---------- Spelare ----------

export type Position = "C" | "LW" | "RW" | "D" | "G";

/** Ett heltal 1–20 (synliga attribut). TypeScript kan inte tvinga intervallet, bara dokumentera det. */
export type Rating20 = number;
/** Ett heltal 1–200 (dolda förmågor, CA/PA). */
export type Rating200 = number;

/** Attribut som spelaren/användaren kan se (1–20). */
export interface VisibleAttributes {
  shooting: Rating20;
  skating: Rating20;
  vision: Rating20;
  physical: Rating20;
  defense: Rating20;
  screening: Rating20;
}

/** Dolda attribut som bara simuleringen känner till. */
export interface HiddenAttributes {
  currentAbility: Rating200; // CA: hur bra spelaren är nu
  potentialAbility: Rating200; // PA: hur bra spelaren kan bli (PA >= CA)
  consistency: Rating20; // hur jämn formen är från match till match
  injuryProneness: Rating20; // hög = lättskadad
}

export type PlayerId = string;

export interface Player {
  id: PlayerId;
  name: string;
  position: Position;
  hidden: HiddenAttributes;
  visible: VisibleAttributes;
}

// ---------- Taktiska roller ----------

export type TacticalRole =
  | "NetFrontScreen"
  | "Playmaker"
  | "Sniper"
  | "TwoWay"
  | "StayAtHomeD"
  | "OffensiveD"
  | "Enforcer";

// ---------- Lag & uppställning ----------

/** En plats i en kedja: vilken spelare som står där och vilken roll han/hon spelar. */
export interface Assignment {
  playerId: PlayerId;
  role: TacticalRole;
}

/** Kedja med tre forwards (Line 1–4). */
export interface ForwardLine {
  C: Assignment;
  LW: Assignment;
  RW: Assignment;
}

/** Backpar (Pair 1–3). */
export interface DefensePair {
  LD: Assignment;
  RD: Assignment;
}

/** Powerplay-enhet: 5 skridskoåkare (3 forwards + 2 backar). */
export interface PowerPlayUnit extends ForwardLine, DefensePair {}

/** Boxplay-enhet: 4 skridskoåkare (1 center, 1 wing, 2 backar). */
export interface PenaltyKillUnit extends DefensePair {
  C: Assignment;
  W: Assignment;
}

export interface Lineup {
  goalie: PlayerId; // startmålvakten
  lines: [ForwardLine, ForwardLine, ForwardLine, ForwardLine]; // Line 1–4
  pairs: [DefensePair, DefensePair, DefensePair]; // Pair 1–3
  pp1: PowerPlayUnit;
  pk1: PenaltyKillUnit;
}

export interface Team {
  id: string;
  name: string;
  roster: Player[]; // alla spelare i truppen
  lineup: Lineup;
}
