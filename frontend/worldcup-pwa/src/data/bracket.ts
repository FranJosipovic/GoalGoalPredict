// FIFA World Cup 2026 knockout-stage skeleton.
//
// API-Football has no "bracket" endpoint — it only returns knockout *fixtures* once teams
// are assigned, and never the tree's shape. So the structure (slots, feeders) is hard-coded
// here; real teams/scores are resolved at render time from Standings + Matches data.
//
// Slot labels:
//   "1A".."2L"      group position — rank 1 or 2 of that group (resolved from standings)
//   "3A/B/C/D/F"    one of the best third-placed teams from those groups (TBD until drawn)
//   "W74" / "L101"  winner / loser of match #74 / #101 (resolved from results, later)
//   "Germany"       a literal team name (already seeded in the official schedule)

export type KnockoutRound =
  | 'Round of 32'
  | 'Round of 16'
  | 'Quarter-final'
  | 'Semi-final'
  | 'Match for third place'
  | 'Final'

export interface BracketMatch {
  round: KnockoutRound
  num: number
  date: string
  time: string
  team1: string
  team2: string
  ground: string
}

export const ROUND_ORDER: KnockoutRound[] = [
  'Round of 32',
  'Round of 16',
  'Quarter-final',
  'Semi-final',
  'Final',
]

export const ROUND_LABEL: Record<KnockoutRound, string> = {
  'Round of 32': 'Round of 32',
  'Round of 16': 'Round of 16',
  'Quarter-final': 'Quarter-finals',
  'Semi-final': 'Semi-finals',
  'Match for third place': '3rd place',
  Final: 'Final',
}

export const BRACKET: BracketMatch[] = [
  { round: 'Round of 32', num: 73, date: '2026-06-28', time: '12:00 UTC-7', team1: '2A', team2: '2B', ground: 'Los Angeles (Inglewood)' },
  { round: 'Round of 32', num: 74, date: '2026-06-29', time: '16:30 UTC-4', team1: 'Germany', team2: '3A/B/C/D/F', ground: 'Boston (Foxborough)' },
  { round: 'Round of 32', num: 75, date: '2026-06-29', time: '19:00 UTC-6', team1: '1F', team2: '2C', ground: 'Monterrey (Guadalupe)' },
  { round: 'Round of 32', num: 76, date: '2026-06-29', time: '12:00 UTC-5', team1: '1C', team2: '2F', ground: 'Houston' },
  { round: 'Round of 32', num: 77, date: '2026-06-30', time: '17:00 UTC-4', team1: '1I', team2: '3C/D/F/G/H', ground: 'New York/New Jersey (East Rutherford)' },
  { round: 'Round of 32', num: 78, date: '2026-06-30', time: '12:00 UTC-5', team1: '2E', team2: '2I', ground: 'Dallas (Arlington)' },
  { round: 'Round of 32', num: 79, date: '2026-06-30', time: '19:00 UTC-6', team1: 'Mexico', team2: '3C/E/F/H/I', ground: 'Mexico City' },
  { round: 'Round of 32', num: 80, date: '2026-07-01', time: '12:00 UTC-4', team1: '1L', team2: '3E/H/I/J/K', ground: 'Atlanta' },
  { round: 'Round of 32', num: 81, date: '2026-07-01', time: '17:00 UTC-7', team1: 'USA', team2: '3B/E/F/I/J', ground: 'San Francisco Bay Area (Santa Clara)' },
  { round: 'Round of 32', num: 82, date: '2026-07-01', time: '13:00 UTC-7', team1: '1G', team2: '3A/E/H/I/J', ground: 'Seattle' },
  { round: 'Round of 32', num: 83, date: '2026-07-02', time: '19:00 UTC-4', team1: '2K', team2: '2L', ground: 'Toronto' },
  { round: 'Round of 32', num: 84, date: '2026-07-02', time: '12:00 UTC-7', team1: '1H', team2: '2J', ground: 'Los Angeles (Inglewood)' },
  { round: 'Round of 32', num: 85, date: '2026-07-02', time: '20:00 UTC-7', team1: '1B', team2: '3E/F/G/I/J', ground: 'Vancouver' },
  { round: 'Round of 32', num: 86, date: '2026-07-03', time: '18:00 UTC-4', team1: '1J', team2: '2H', ground: 'Miami (Miami Gardens)' },
  { round: 'Round of 32', num: 87, date: '2026-07-03', time: '20:30 UTC-5', team1: '1K', team2: '3D/E/I/J/L', ground: 'Kansas City' },
  { round: 'Round of 32', num: 88, date: '2026-07-03', time: '13:00 UTC-5', team1: '2D', team2: '2G', ground: 'Dallas (Arlington)' },
  { round: 'Round of 16', num: 89, date: '2026-07-04', time: '17:00 UTC-4', team1: 'W74', team2: 'W77', ground: 'Philadelphia' },
  { round: 'Round of 16', num: 90, date: '2026-07-04', time: '12:00 UTC-5', team1: 'W73', team2: 'W75', ground: 'Houston' },
  { round: 'Round of 16', num: 91, date: '2026-07-05', time: '16:00 UTC-4', team1: 'W76', team2: 'W78', ground: 'New York/New Jersey (East Rutherford)' },
  { round: 'Round of 16', num: 92, date: '2026-07-05', time: '18:00 UTC-6', team1: 'W79', team2: 'W80', ground: 'Mexico City' },
  { round: 'Round of 16', num: 93, date: '2026-07-06', time: '14:00 UTC-5', team1: 'W83', team2: 'W84', ground: 'Dallas (Arlington)' },
  { round: 'Round of 16', num: 94, date: '2026-07-06', time: '17:00 UTC-7', team1: 'W81', team2: 'W82', ground: 'Seattle' },
  { round: 'Round of 16', num: 95, date: '2026-07-07', time: '12:00 UTC-4', team1: 'W86', team2: 'W88', ground: 'Atlanta' },
  { round: 'Round of 16', num: 96, date: '2026-07-07', time: '13:00 UTC-7', team1: 'W85', team2: 'W87', ground: 'Vancouver' },
  { round: 'Quarter-final', num: 97, date: '2026-07-09', time: '16:00 UTC-4', team1: 'W89', team2: 'W90', ground: 'Boston (Foxborough)' },
  { round: 'Quarter-final', num: 98, date: '2026-07-10', time: '12:00 UTC-7', team1: 'W93', team2: 'W94', ground: 'Los Angeles (Inglewood)' },
  { round: 'Quarter-final', num: 99, date: '2026-07-11', time: '17:00 UTC-4', team1: 'W91', team2: 'W92', ground: 'Miami (Miami Gardens)' },
  { round: 'Quarter-final', num: 100, date: '2026-07-11', time: '20:00 UTC-5', team1: 'W95', team2: 'W96', ground: 'Kansas City' },
  { round: 'Semi-final', num: 101, date: '2026-07-14', time: '14:00 UTC-5', team1: 'W97', team2: 'W98', ground: 'Dallas (Arlington)' },
  { round: 'Semi-final', num: 102, date: '2026-07-15', time: '15:00 UTC-4', team1: 'W99', team2: 'W100', ground: 'Atlanta' },
  { round: 'Match for third place', num: 103, date: '2026-07-18', time: '17:00 UTC-4', team1: 'L101', team2: 'L102', ground: 'Miami (Miami Gardens)' },
  { round: 'Final', num: 104, date: '2026-07-19', time: '15:00 UTC-4', team1: 'W101', team2: 'W102', ground: 'New York/New Jersey (East Rutherford)' },
]

export type SlotKind = 'team' | 'group' | 'third' | 'winner' | 'loser'

export interface ResolvedSlot {
  kind: SlotKind
  label: string      // short display text when unresolved, e.g. "1A", "3rd A/B/C/D/F", "W74"
  teamName?: string  // resolved team name when known
  logoUrl?: string   // resolved crest when known
}

const GROUP_RE = /^([12])([A-L])$/
const THIRD_RE = /^3(.+)$/
const WINNER_RE = /^W(\d+)$/
const LOSER_RE = /^L(\d+)$/

// Classifies a raw skeleton label into a slot we can render, resolving group positions and
// literal team names against live data. Lookup maps are built by the caller from standings/teams.
export function classifySlot(
  raw: string,
  groupPick: (group: string, rank: number) => { name: string; logo: string } | undefined,
  teamByName: (name: string) => { name: string; logo: string } | undefined,
): ResolvedSlot {
  const g = raw.match(GROUP_RE)
  if (g) {
    const rank = Number(g[1])
    const group = g[2]
    const pick = groupPick(group, rank)
    return pick
      ? { kind: 'group', label: raw, teamName: pick.name, logoUrl: pick.logo }
      : { kind: 'group', label: `${rank === 1 ? 'Winner' : 'Runner-up'} ${group}` }
  }
  const third = raw.match(THIRD_RE)
  if (third) return { kind: 'third', label: `3rd ${third[1]}` }

  const w = raw.match(WINNER_RE)
  if (w) return { kind: 'winner', label: `Winner ${w[1]}` }

  const l = raw.match(LOSER_RE)
  if (l) return { kind: 'loser', label: `Loser ${l[1]}` }

  // Literal team name — try to attach a crest.
  const t = teamByName(raw)
  return { kind: 'team', label: raw, teamName: raw, logoUrl: t?.logo }
}
