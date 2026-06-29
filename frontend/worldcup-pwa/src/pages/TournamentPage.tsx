import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import Bracket from '../components/Bracket'
import { getStandings, getTopScorers, getTournamentFixtures } from '../api/tournament'
import { getTeams } from '../api/teams'
import type { StandingGroup, TeamInfo, TopScorer, MatchListItem } from '../types'

type View = 'groups' | 'bracket' | 'scorers' | 'teams'

export default function TournamentPage() {
  const [groups, setGroups] = useState<StandingGroup[]>([])
  const [scorers, setScorers] = useState<TopScorer[]>([])
  const [teams, setTeams] = useState<TeamInfo[]>([])
  const [fixtures, setFixtures] = useState<MatchListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('groups')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      getStandings().catch(() => [] as StandingGroup[]),
      getTopScorers().catch(() => [] as TopScorer[]),
      getTeams().catch(() => [] as TeamInfo[]),
      getTournamentFixtures().catch(() => [] as MatchListItem[]),
    ]).then(([g, s, t, f]) => {
      setGroups(g)
      setScorers(s)
      setTeams(t)
      setFixtures(f)
      // Fall back to the team grid if standings haven't synced yet.
      if (g.length === 0) setView('teams')
    }).finally(() => setLoading(false))
  }, [])

  const filteredTeams = teams.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.country.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <Layout title="Tournament">
      <div className="loading-state"><span className="loading-ball">⚽</span></div>
    </Layout>
  )

  return (
    <Layout title="WC 2026">
      <div className="tournament-page">
        <div className="tournament-hero">
          <div className="tournament-title">FIFA World Cup 2026</div>
          <div className="tournament-sub">48 teams · 104 matches · Jun 11 – Jul 19</div>
        </div>

        <div className="tournament-toggle">
          <button className={`tt-btn ${view === 'groups' ? 'tt-btn--on' : ''}`} onClick={() => setView('groups')}>
            Groups
          </button>
          <button className={`tt-btn ${view === 'bracket' ? 'tt-btn--on' : ''}`} onClick={() => setView('bracket')}>
            Bracket
          </button>
          <button className={`tt-btn ${view === 'scorers' ? 'tt-btn--on' : ''}`} onClick={() => setView('scorers')}>
            Scorers
          </button>
          <button className={`tt-btn ${view === 'teams' ? 'tt-btn--on' : ''}`} onClick={() => setView('teams')}>
            Teams
          </button>
        </div>

        {view === 'groups' ? (
          groups.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📊</span>
              <p className="empty-title">Standings not available yet</p>
              <p className="empty-sub">They appear once the tournament data syncs</p>
            </div>
          ) : (
            <div className="standings-groups">
              {groups.map(g => (
                <div key={g.groupName} className="standings-group">
                  <div className="standings-group-head">{g.groupName}</div>
                  <table className="standings-table">
                    <thead>
                      <tr>
                        <th className="st-pos">#</th>
                        <th className="st-team">Team</th>
                        <th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.rows.map(r => {
                        // The API marks advancing teams with a description like "Round of 32".
                        const qualifies = /round of/i.test(r.description ?? '')
                        return (
                        <tr key={r.teamId} className={`standings-row ${qualifies ? 'standings-row--qualify' : ''}`} onClick={() => navigate(`/tournament/team/${r.teamId}`)}>
                          <td className="st-pos">{r.rank}</td>
                          <td className="st-team">
                            <img src={r.logoUrl} className="st-logo" alt="" />
                            <span className="st-name">{r.teamName}</span>
                          </td>
                          <td>{r.played}</td>
                          <td>{r.win}</td>
                          <td>{r.draw}</td>
                          <td>{r.lose}</td>
                          <td>{r.goalsDiff > 0 ? `+${r.goalsDiff}` : r.goalsDiff}</td>
                          <td className="st-pts">{r.points}</td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )
        ) : view === 'bracket' ? (
          <Bracket standings={groups} teams={teams} matches={fixtures} />
        ) : view === 'scorers' ? (
          scorers.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">👟</span>
              <p className="empty-title">No scorers yet</p>
              <p className="empty-sub">They appear once goals are scored</p>
            </div>
          ) : (
            <div className="scorers-list">
              {scorers.map(s => (
                <div key={s.playerId} className="scorer-row">
                  <span className="scorer-rank">{s.rank}</span>
                  {s.photoUrl
                    ? <img src={s.photoUrl} className="scorer-photo" alt="" />
                    : <span className="scorer-photo scorer-photo--ph">{s.name.split(' ').pop()?.[0]}</span>}
                  <div className="scorer-info">
                    <span className="scorer-name">{s.name}</span>
                    <span className="scorer-team">
                      {s.teamLogo && <img src={s.teamLogo} className="scorer-team-logo" alt="" />}
                      {s.teamName}
                    </span>
                  </div>
                  <div className="scorer-stats">
                    <span className="scorer-goals">{s.goals}</span>
                    <span className="scorer-goals-lbl">goals</span>
                    {s.assists > 0 && <span className="scorer-assists">{s.assists} ast</span>}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <>
            <div className="tournament-search-wrap">
              <input
                className="field-input"
                placeholder="Search team..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="teams-grid">
              {filteredTeams.map(t => (
                <button
                  key={t.id}
                  className="team-tile"
                  onClick={() => navigate(`/tournament/team/${t.id}`)}
                >
                  <img src={t.logoUrl} alt={t.code} className="team-tile-logo" />
                  <span className="team-tile-name">{t.name}</span>
                  <span className="team-tile-code">{t.code}</span>
                </button>
              ))}
            </div>
            {filteredTeams.length === 0 && (
              <div className="empty-state">
                <span className="empty-icon">🔍</span>
                <p className="empty-title">No teams found</p>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
