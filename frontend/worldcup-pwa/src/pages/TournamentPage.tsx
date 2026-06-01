import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { getTeams } from '../api/teams'
import type { TeamInfo } from '../types'

// WC 2026 groups (will be populated from real API data grouped by teams)
// For now we group teams alphabetically into display sections
export default function TournamentPage() {
  const [teams, setTeams] = useState<TeamInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    getTeams().then(setTeams).finally(() => setLoading(false))
  }, [])

  const filtered = teams.filter(t =>
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

        <div className="tournament-search-wrap">
          <input
            className="field-input"
            placeholder="Search team..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="teams-grid">
          {filtered.map(t => (
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

        {filtered.length === 0 && (
          <div className="empty-state">
            <span className="empty-icon">🔍</span>
            <p className="empty-title">No teams found</p>
          </div>
        )}
      </div>
    </Layout>
  )
}
