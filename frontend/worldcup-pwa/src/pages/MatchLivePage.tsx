import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { getMatchDetail, getMatchPredictions } from '../api/matches'
import { useAuthStore } from '../store/authStore'
import type { MatchDetail, GroupPredictions } from '../types'

const posColor: Record<string, string> = {
  Goalkeeper: '#64b5f6', Defender: '#4db6ac', Midfielder: '#ffd54f', Attacker: '#ef5350'
}

export default function MatchLivePage() {
  const { groupId, matchId } = useParams<{ groupId: string; matchId: string }>()
  const { user } = useAuthStore()
  const [match, setMatch] = useState<MatchDetail | null>(null)
  const [preds, setPreds] = useState<GroupPredictions | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!matchId || !groupId) return
    const [m, p] = await Promise.all([
      getMatchDetail(Number(matchId)),
      getMatchPredictions(Number(matchId), groupId).catch(() => null),
    ])
    setMatch(m)
    setPreds(p)
    setLoading(false)
  }, [matchId, groupId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!match) return
    const isLive = ['1H','HT','2H','ET','P'].includes(match.status)
    if (!isLive) return
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [match, load])

  if (loading) return <Layout showBack><div className="loading-state"><span className="loading-ball">⚽</span></div></Layout>
  if (!match) return <Layout showBack><div className="empty-state"><p>Match not found</p></div></Layout>

  const isLive = ['1H','HT','2H','ET','P'].includes(match.status)
  const isFinished = ['FT','AET','PEN'].includes(match.status)

  return (
    <Layout title="Match" showBack>
      <div className="live-page">
        {/* Score header */}
        <div className="live-scoreboard">
          <div className="live-team">
            <img src={match.homeTeam.logoUrl} className="live-team-logo" alt="" />
            <span className="live-team-name">{match.homeTeam.name}</span>
          </div>
          <div className="live-score-block">
            <div className="live-score-nums">
              <span>{match.homeGoals ?? '-'}</span>
              <span className="live-score-colon">:</span>
              <span>{match.awayGoals ?? '-'}</span>
            </div>
            {isLive && <div className="live-indicator"><span className="live-dot" />{match.elapsedMinutes}'</div>}
            {isFinished && <div className="ft-label">FULL TIME</div>}
          </div>
          <div className="live-team live-team--right">
            <img src={match.awayTeam.logoUrl} className="live-team-logo" alt="" />
            <span className="live-team-name">{match.awayTeam.name}</span>
          </div>
        </div>

        {/* Goals timeline */}
        {match.goals.length > 0 && (
          <div className="goals-timeline">
            <div className="section-label">GOALS</div>
            {match.goals.map((g, i) => (
              <div key={i} className={`goal-event ${g.teamId === match.homeTeam.id ? 'goal-event--home' : 'goal-event--away'}`}>
                <span className="goal-min">{g.minute}{g.extraMinute ? `+${g.extraMinute}` : ''}'</span>
                <span className="goal-type-icon">
                  {g.goalType === 'Penalty' ? '(P)' : g.goalType === 'Own Goal' ? '(OG)' : '⚽'}
                </span>
                <span className="goal-scorer">{g.scorerName ?? 'Unknown'}</span>
              </div>
            ))}
          </div>
        )}

        {/* Group predictions */}
        {preds && preds.predictions.length > 0 && (
          <div className="live-predictions">
            <div className="section-label">GROUP PREDICTIONS</div>
            {preds.predictions.map(p => {
              const isMe = p.userId === user?.id
              return (
                <div key={p.userId} className={`live-pred-row ${isMe ? 'live-pred-row--me' : ''}`}>
                  <div className="live-pred-user">
                    <div className="live-pred-avatar">
                      {p.firstName[0]}{p.lastName[0]}
                    </div>
                    <div>
                      <div className="live-pred-name">
                        {p.firstName} {isMe && <span className="you-badge">you</span>}
                      </div>
                      <div className="live-pred-pick">{p.predHome}:{p.predAway}</div>
                    </div>
                  </div>
                  <div className="live-pred-scorers">
                    {p.scorers.map((s, i) => (
                      <span key={i} className="live-scorer-chip" style={{ borderColor: posColor[s.position] }}>
                        {s.name.split(' ').pop()}
                      </span>
                    ))}
                  </div>
                  <div className="live-pred-pts">
                    <span className="live-pts-num">{p.projectedPoints}</span>
                    <span className="live-pts-label">pts</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Lineups */}
        {match.lineup.length > 0 && (
          <div className="lineup-section">
            <div className="section-label">LINEUPS</div>
            <div className="lineup-cols">
              {[match.homeTeam, match.awayTeam].map(team => (
                <div key={team.id} className="lineup-col">
                  <div className="lineup-team-name">{team.name}</div>
                  {match.lineup
                    .filter(l => l.teamId === team.id && l.isStarting)
                    .map(l => (
                      <div key={l.playerId} className="lineup-player">
                        <span className="lineup-num">#{l.shirtNumber}</span>
                        <span className="lineup-name">{l.name}</span>
                        <span className="lineup-pos">{l.position}</span>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
