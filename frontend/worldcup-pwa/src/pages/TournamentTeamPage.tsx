import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { getTeamSquad } from '../api/teams'
import { getTeamDetail } from '../api/tournament'
import type { TeamSquad, TeamDetail } from '../types'

const POS_ORDER = ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker']
const POS_LABELS: Record<string, string> = {
  Goalkeeper: 'Goalkeepers', Defender: 'Defenders', Midfielder: 'Midfielders', Attacker: 'Attackers',
}
const LIVE = ['1H', 'HT', '2H', 'ET', 'P']
const FINISHED = ['FT', 'AET', 'PEN']

function formatDay(utc: string) {
  return new Date(utc).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function FormDots({ form }: { form: string }) {
  if (!form) return null
  return (
    <span className="form-dots">
      {form.split('').slice(-5).map((c, i) => (
        <span key={i} className={`form-dot form-dot--${c.toLowerCase()}`}>{c}</span>
      ))}
    </span>
  )
}

export default function TournamentTeamPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const [detail, setDetail] = useState<TeamDetail | null>(null)
  const [squad, setSquad] = useState<TeamSquad | null>(null)
  const [tab, setTab] = useState<'overview' | 'matches' | 'squad'>('overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!teamId) return
    Promise.all([
      getTeamDetail(Number(teamId)),
      getTeamSquad(Number(teamId)).catch(() => null),
    ]).then(([d, s]) => { setDetail(d); setSquad(s) })
      .finally(() => setLoading(false))
  }, [teamId])

  if (loading) return <Layout showBack><div className="loading-state"><span className="loading-ball">⚽</span></div></Layout>
  if (!detail) return <Layout showBack><div className="empty-state"><p>Team not found</p></div></Layout>

  const { team, standing, stats, matches } = detail
  const grouped = POS_ORDER.reduce<Record<string, NonNullable<typeof squad>['players']>>((acc, pos) => {
    acc[pos] = (squad?.players ?? []).filter(p => p.position === pos).sort((a, b) => a.shirtNumber - b.shirtNumber)
    return acc
  }, {})

  return (
    <Layout title={team.name} showBack>
      <div className="team-page">
        <div className="team-hero">
          <img src={team.logoUrl} className="team-hero-logo" alt={team.name} />
          <div className="team-hero-name">{team.name}</div>
          {standing && (
            <div className="team-hero-standing">
              {standing.groupName ? `${standing.groupName} · ` : ''}#{standing.rank} · {standing.points} pts{standing.description ? ` · ${standing.description}` : ''}
            </div>
          )}
          {stats?.form && <FormDots form={stats.form} />}
        </div>

        <div className="match-tabs">
          {([['overview', '📊 Overview'], ['matches', '⚽ Matches'], ['squad', '👕 Squad']] as const).map(([t, label]) => (
            <button key={t} className={`match-tab ${tab === t ? 'match-tab--active' : ''}`} onClick={() => setTab(t)}>
              {label}
            </button>
          ))}
        </div>

        {/* OVERVIEW: stats */}
        {tab === 'overview' && (
          stats ? (
            <div className="team-stats">
              <div className="stat-cards">
                <div className="stat-card"><span className="stat-num">{stats.played}</span><span className="stat-lbl">Played</span></div>
                <div className="stat-card"><span className="stat-num">{stats.wins}-{stats.draws}-{stats.loses}</span><span className="stat-lbl">W-D-L</span></div>
                <div className="stat-card"><span className="stat-num">{stats.goalsFor ?? 0}:{stats.goalsAgainst ?? 0}</span><span className="stat-lbl">Goals F:A</span></div>
                <div className="stat-card"><span className="stat-num">{stats.cleanSheets}</span><span className="stat-lbl">Clean sheets</span></div>
                <div className="stat-card"><span className="stat-num">{stats.failedToScore}</span><span className="stat-lbl">Failed to score</span></div>
                <div className="stat-card"><span className="stat-num">{stats.penaltyScored}/{stats.penaltyScored + stats.penaltyMissed}</span><span className="stat-lbl">Penalties</span></div>
                <div className="stat-card"><span className="stat-num">🟨 {stats.yellowCards}</span><span className="stat-lbl">Yellow cards</span></div>
                <div className="stat-card"><span className="stat-num">🟥 {stats.redCards}</span><span className="stat-lbl">Red cards</span></div>
                {stats.formation && <div className="stat-card"><span className="stat-num">{stats.formation}</span><span className="stat-lbl">Formation</span></div>}
              </div>
            </div>
          ) : (
            <div className="empty-state"><span className="empty-icon">📊</span><p className="empty-title">No stats yet</p></div>
          )
        )}

        {/* MATCHES */}
        {tab === 'matches' && (
          matches.length === 0 ? (
            <div className="empty-state"><span className="empty-icon">📅</span><p className="empty-title">No matches</p></div>
          ) : (
            <div className="team-matches">
              {matches.map(m => {
                const live = LIVE.includes(m.status)
                const done = FINISHED.includes(m.status)
                const won = done && m.teamGoals != null && m.opponentGoals != null && m.teamGoals > m.opponentGoals
                const lost = done && m.teamGoals != null && m.opponentGoals != null && m.teamGoals < m.opponentGoals
                return (
                  <div key={m.id} className={`tm-row ${live ? 'tm-row--live' : ''}`}>
                    <div className="tm-meta">
                      <span className="tm-round">{m.round}</span>
                      <span className="tm-when">{formatDay(m.kickoffUtc)}</span>
                    </div>
                    <div className="tm-fixture">
                      <span className="tm-haway">{m.isHome ? 'H' : 'A'}</span>
                      <img src={m.opponent.logoUrl} className="tm-logo" alt="" />
                      <span className="tm-opp">{m.opponent.name}</span>
                      <span className={`tm-score ${won ? 'tm-score--w' : lost ? 'tm-score--l' : ''}`}>
                        {live || done ? `${m.teamGoals ?? 0}–${m.opponentGoals ?? 0}` : '—'}
                      </span>
                    </div>
                    {live && <span className="tm-flag tm-flag--live">LIVE</span>}
                    {done && <span className="tm-flag">{m.status}</span>}
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* SQUAD */}
        {tab === 'squad' && (
          <div className="squad-sections">
            {POS_ORDER.map(pos => {
              const players = grouped[pos]
              if (!players?.length) return null
              return (
                <div key={pos} className="squad-section">
                  <div className="squad-section-header">
                    <span className="squad-pos-label">{POS_LABELS[pos]}</span>
                  </div>
                  {players.map(p => (
                    <div key={p.id} className="squad-player">
                      <div className="squad-avatar">{p.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
                      <div className="squad-player-info">
                        <div className="squad-player-name">{p.name}</div>
                        <div className="squad-player-meta">#{p.shirtNumber} · {p.age}y</div>
                      </div>
                      <div className={`squad-pos-badge squad-pos-badge--${pos.toLowerCase()}`}>{pos.slice(0, 3).toUpperCase()}</div>
                    </div>
                  ))}
                </div>
              )
            })}
            {(!squad || squad.players.length === 0) && (
              <div className="empty-state"><span className="empty-icon">👕</span><p className="empty-title">Squad not available</p></div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
