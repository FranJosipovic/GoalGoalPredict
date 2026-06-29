import type { ScorerPick, CardPick, TeamSummary } from '../types'
import Icon, { FootballCard } from './Icon'

function typeTag(goalType: string) {
  if (goalType === 'Penalty') return 'P'
  if (goalType === 'Own Goal') return 'OG'
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
{sc.length === 0 && cd.length === 0 && <span className="picks-team-empty">—</span>}
            <div className="picks-team-chips">
              {sc.map((s, i) => {
                const hit = s.pointsAwarded > 0
                const tag = typeTag(s.goalType)
                return (
                  <span key={`s${i}`} className={`pick-chip pick-chip--goal ${hit ? 'pick-chip--hit' : ''}`}>
                    <Icon name="ball" size={13} className="pick-chip-ico" />
                    <span className="pick-chip-name">{s.name.split(' ').pop()}</span>
                    {tag && <span className="pick-chip-tag">{tag}</span>}
                    {hit && <strong>+{s.pointsAwarded}</strong>}
                  </span>
                )
              })}
              {cd.map((c, i) => {
                const hit = c.pointsAwarded > 0
                const miss = c.pointsAwarded < 0
                return (
                  <span key={`c${i}`}
                    className={`pick-chip ${hit ? 'pick-chip--hit' : ''} ${miss ? 'pick-chip--miss' : ''}`}>
                    {c.kind === 'MissedPenalty'
                      ? <Icon name="close" size={12} className="pick-chip-ico pick-chip-ico--miss" />
                      : <FootballCard color={c.kind === 'Red' ? 'red' : 'yellow'} size={13} />}
                    <span className="pick-chip-name">{c.name.split(' ').pop()}</span>
                    {c.pointsAwarded !== 0 && (
                      <strong>{c.pointsAwarded > 0 ? `+${c.pointsAwarded}` : c.pointsAwarded}</strong>
                    )}
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
