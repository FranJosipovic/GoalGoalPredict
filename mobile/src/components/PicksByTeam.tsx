import { StyleSheet, Text, View } from 'react-native'
import { colors, fonts } from '../theme'
import Icon, { FootballCard } from './Icon'
import type { ScorerPick, CardPick, TeamSummary } from '../types'

function typeTag(goalType: string) {
  if (goalType === 'Penalty') return 'P'
  if (goalType === 'Own Goal') return 'OG'
  return ''
}

const lastName = (n: string) => n.split(' ').pop() ?? n

// Scorer + card picks grouped under their team. Mirrors the PWA's PicksByTeam.
export default function PicksByTeam({
  scorers,
  cards,
  home,
  away,
}: {
  scorers: ScorerPick[]
  cards: CardPick[]
  home: TeamSummary
  away: TeamSummary
}) {
  if (scorers.length === 0 && cards.length === 0) return null

  return (
    <View style={styles.teams}>
      {[home, away].map((t, ti) => {
        const sc = scorers.filter((s) => s.teamId === t.id)
        const cd = cards.filter((c) => c.teamId === t.id)
        const away = ti === 1
        return (
          <View key={t.id} style={[styles.team, away && styles.teamAway]}>
            {sc.length === 0 && cd.length === 0 ? (
              <Text style={styles.empty}>—</Text>
            ) : (
              <View style={[styles.chips, away && styles.chipsAway]}>
                {sc.map((s, i) => {
                  const hit = s.pointsAwarded > 0
                  const tag = typeTag(s.goalType)
                  return (
                    <View key={`s${i}`} style={[styles.chip, hit && styles.chipHit]}>
                      <Icon name="ball" size={12} color={hit ? colors.accent : colors.textMuted} />
                      <Text style={styles.chipName} numberOfLines={1}>
                        {lastName(s.name)}
                      </Text>
                      {!!tag && (
                        <View style={styles.tag}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      )}
                      {hit && <Text style={styles.pts}>+{s.pointsAwarded}</Text>}
                    </View>
                  )
                })}
                {cd.map((c, i) => {
                  const hit = c.pointsAwarded > 0
                  const miss = c.pointsAwarded < 0
                  return (
                    <View
                      key={`c${i}`}
                      style={[styles.chip, hit && styles.chipHit, miss && styles.chipMiss]}
                    >
                      {c.kind === 'MissedPenalty' ? (
                        <Icon name="close" size={12} color={colors.error} />
                      ) : (
                        <FootballCard color={c.kind === 'Red' ? 'red' : 'yellow'} size={13} />
                      )}
                      <Text style={styles.chipName} numberOfLines={1}>
                        {lastName(c.name)}
                      </Text>
                      {c.pointsAwarded !== 0 && (
                        <Text style={[styles.pts, miss && styles.ptsMiss]}>
                          {c.pointsAwarded > 0 ? `+${c.pointsAwarded}` : c.pointsAwarded}
                        </Text>
                      )}
                    </View>
                  )
                })}
              </View>
            )}
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  teams: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  team: { flex: 1, minWidth: 0 },
  teamAway: { alignItems: 'flex-end' },
  chips: { alignItems: 'flex-start', gap: 6 },
  chipsAway: { alignItems: 'flex-end' },
  empty: { fontSize: 13, color: colors.textMuted },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.borderSolid,
    maxWidth: '100%',
  },
  chipHit: { backgroundColor: colors.accentGlow, borderColor: colors.accentDim },
  chipMiss: { backgroundColor: colors.errorBg, borderColor: 'rgba(239,83,80,0.4)' },
  chipName: { fontSize: 12, color: colors.text, flexShrink: 1, fontFamily: fonts.body },
  tag: { backgroundColor: colors.textMuted, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  tagText: { fontFamily: fonts.heading, fontSize: 9, color: colors.onAccent },
  pts: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.accent },
  ptsMiss: { color: colors.error },
})
