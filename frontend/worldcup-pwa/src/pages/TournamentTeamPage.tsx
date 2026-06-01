import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { getTeamSquad } from '../api/teams'
import type { TeamSquad } from '../types'

const POS_ORDER = ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker']
const POS_LABELS: Record<string, string> = {
  Goalkeeper: 'Goalkeepers',
  Defender: 'Defenders',
  Midfielder: 'Midfielders',
  Attacker: 'Attackers',
}
const POS_PTS: Record<string, number> = {
  Goalkeeper: 4, Defender: 4, Midfielder: 2, Attacker: 1
}

export default function TournamentTeamPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const [squad, setSquad] = useState<TeamSquad | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!teamId) return
    getTeamSquad(Number(teamId)).then(setSquad).finally(() => setLoading(false))
  }, [teamId])

  if (loading) return <Layout showBack><div className="loading-state"><span className="loading-ball">⚽</span></div></Layout>
  if (!squad) return <Layout showBack><div className="empty-state"><p>Team not found</p></div></Layout>

  const grouped = POS_ORDER.reduce<Record<string, typeof squad.players>>((acc, pos) => {
    acc[pos] = squad.players.filter(p => p.position === pos).sort((a, b) => a.shirtNumber - b.shirtNumber)
    return acc
  }, {})

  return (
    <Layout title={squad.team.name} showBack>
      <div className="team-page">
        <div className="team-hero">
          <img src={squad.team.logoUrl} className="team-hero-logo" alt={squad.team.name} />
          <div className="team-hero-name">{squad.team.name}</div>
          <div className="team-hero-code">{squad.team.code}</div>
          <div className="team-hero-count">{squad.players.length} players</div>
        </div>

        <div className="squad-sections">
          {POS_ORDER.map(pos => {
            const players = grouped[pos]
            if (!players?.length) return null
            return (
              <div key={pos} className="squad-section">
                <div className="squad-section-header">
                  <span className="squad-pos-label">{POS_LABELS[pos]}</span>
                  <span className="squad-pts-hint">{POS_PTS[pos]}pts per goal</span>
                </div>
                {players.map(p => (
                  <div key={p.id} className="squad-player">
                    <div className="squad-avatar">
                      {p.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div className="squad-player-info">
                      <div className="squad-player-name">{p.name}</div>
                      <div className="squad-player-meta">#{p.shirtNumber} · {p.age}y</div>
                    </div>
                    <div className={`squad-pos-badge squad-pos-badge--${pos.toLowerCase()}`}>
                      {pos.slice(0, 3).toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </Layout>
  )
}
