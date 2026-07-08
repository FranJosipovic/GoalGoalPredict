// Competitions surfaced in onboarding. `live` = playable now; others show a
// "coming soon" badge. Keep this in sync with the mobile app's copy and only
// mark leagues `live` once they're wired into the backend.
export interface LeagueInfo {
  key: string
  name: string
  emoji: string
  live: boolean
}

export const SUPPORTED_LEAGUES: LeagueInfo[] = [
  { key: 'wc', name: 'FIFA World Cup 2026', emoji: '🌍', live: true },
  { key: 'ucl', name: 'Champions League', emoji: '🏆', live: false },
  { key: 'pl', name: 'Premier League', emoji: '🏴', live: false },
  { key: 'laliga', name: 'La Liga', emoji: '🇪🇸', live: false },
  { key: 'seriea', name: 'Serie A', emoji: '🇮🇹', live: false },
  { key: 'bundesliga', name: 'Bundesliga', emoji: '🇩🇪', live: false },
  { key: 'ligue1', name: 'Ligue 1', emoji: '🇫🇷', live: false },
  { key: 'hnl', name: 'SuperSport HNL', emoji: '🇭🇷', live: false },
]
