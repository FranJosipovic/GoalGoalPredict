import type { ScorerPick, CardPick, TeamSummary } from '../types'

const POS_COLOR: Record<string, string> = {
  Goalkeeper: '#64b5f6', Defender: '#4db6ac', Midfielder: '#ffd54f', Attacker: '#ef5350',
}
const CARD_ICON: Record<string, string> = { Yellow: '🟨', Red: '🟥', MissedPenalty: '❌' }

function typeTag(goalType: string) {
  if (goalType === 'Penalty') return ' (P)'
  if (goalType === 'Own Goal') return ' (OG)'
  return ''
}

// Scorer + card picks grouped under their team, instead of one flat name list.
// Used wherever a user's prediction is shown (match detail, Picks tab, player history).
export default function PicksByTeam({ scorers, cards, home, away }: {
  scorers: ScorerPick[]
  cards: CardPick[]
  home: TeamSummary
  away: TeamSummary
}) {
  if (scorers.length === 0 && cards.length === 0) return null
  return (
    <div className="picks-teams">
      {[home, away].map((t, ti) => {
        const sc = scorers.filter(s => s.teamId === t.id)
        const cd = cards.filter(c => c.teamId === t.id)
        return (
          <div key={t.id} className={`picks-team ${ti === 1 ? 'picks-team--away' : ''}`}>
            <div className="picks-team-label">
              <img src={t.logoUrl} className="picks-team-logo" alt="" />
              {t.code || t.name}
            </div>
            {sc.length === 0 && cd.length === 0 && <span className="picks-team-empty">—</span>}
            <div className="picks-team-chips">
              {sc.map((s, i) => {
                const hit = s.pointsAwarded > 0
                return (
                  <span key={`s${i}`} className={`pick-chip ${hit ? 'pick-chip--hit' : ''}`}
                    style={{ borderLeftColor: hit ? 'var(--accent)' : (POS_COLOR[s.position] ?? '#666') }}>
                    ⚽ {s.name.split(' ').pop()}{typeTag(s.goalType)}
                    {hit && <strong>+{s.pointsAwarded}</strong>}
                  </span>
                )
              })}
              {cd.map((c, i) => {
                const hit = c.pointsAwarded > 0
                const miss = c.pointsAwarded < 0
                return (
                  <span key={`c${i}`} className={`pick-chip ${hit ? 'pick-chip--hit' : ''}`}
                    style={{ borderLeftColor: hit ? 'var(--accent)' : miss ? '#ef5350' : '#666' }}>
                    {CARD_ICON[c.kind] ?? '🟨'} {c.name.split(' ').pop()}
                    {c.pointsAwarded !== 0 && <strong> {c.pointsAwarded > 0 ? `+${c.pointsAwarded}` : c.pointsAwarded}</strong>}
                  </span>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
