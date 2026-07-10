import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native'
import { getPlayerStats } from '../api/players'
import { colors, fonts } from '../theme'
import Icon, { FootballCard } from './Icon'
import type { PlayerStats as Stats } from '../types'

const dash = (v: number | null | undefined) => (v === null || v === undefined ? '–' : String(v))
const initialsOf = (name: string) => {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

function Tile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View style={styles.tile}>
      {typeof value === 'string' ? <Text style={styles.tileVal}>{value}</Text> : value}
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  )
}

function CardVal({ color, value }: { color: 'yellow' | 'red'; value: string }) {
  return (
    <View style={styles.cardVal}>
      <FootballCard color={color} size={14} />
      <Text style={styles.tileVal}>{value}</Text>
    </View>
  )
}

export default function PlayerStats({ playerId }: { playerId: number }) {
  const [data, setData] = useState<Stats | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let alive = true
    setState('loading')
    getPlayerStats(playerId)
      .then((d) => alive && (setData(d), setState('ready')))
      .catch(() => alive && setState('error'))
    return () => {
      alive = false
    }
  }, [playerId])

  if (state === 'loading')
    return <ActivityIndicator size="large" color={colors.accent} style={{ marginVertical: 30 }} />
  if (state === 'error' || !data)
    return (
      <View style={styles.empty}>
        <Icon name="search" size={26} color={colors.textMuted} />
        <Text style={styles.emptyText}>Stats unavailable right now.</Text>
      </View>
    )

  const pos = (data.position ?? '').toLowerCase()
  const isGk = pos.startsWith('goalkeeper') || pos === 'g'
  const fullName = [data.firstname, data.lastname].filter(Boolean).join(' ') || data.name
  const meta = [data.teamCode || data.teamName, data.number ? `#${data.number}` : null, data.position]
    .filter(Boolean)
    .join(' · ')

  return (
    <View>
      <View style={styles.hero}>
        <View style={styles.photo}>
          {data.photoUrl ? (
            <Image source={{ uri: data.photoUrl }} style={styles.photoImg} />
          ) : (
            <Text style={styles.photoFallback}>{initialsOf(fullName)}</Text>
          )}
          {!!data.rating && (
            <View style={styles.rating}>
              <Icon name="flame" size={10} color="#fff" />
              <Text style={styles.ratingText}>{data.rating}</Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{fullName}</Text>
            {data.captain && (
              <View style={styles.capt}>
                <Text style={styles.captText}>C</Text>
              </View>
            )}
            {data.injured && <Text style={styles.injured}>Injured</Text>}
          </View>
          <Text style={styles.meta}>{meta}</Text>
          <View style={styles.bio}>
            {data.age != null && <Text style={styles.bioText}>{data.age} yrs</Text>}
            {!!data.nationality && <Text style={styles.bioText}>{data.nationality}</Text>}
            {!!data.height && <Text style={styles.bioText}>{data.height} cm</Text>}
            {!!data.weight && <Text style={styles.bioText}>{data.weight} kg</Text>}
          </View>
        </View>
      </View>

      {!data.hasApiData ? (
        <View style={styles.nodata}>
          <Icon name="chart" size={22} color={colors.textMuted} />
          <Text style={styles.emptyText}>No tournament statistics yet</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          <Tile label="Apps" value={dash(data.appearances)} />
          <Tile label="Minutes" value={dash(data.minutes)} />
          {isGk ? (
            <>
              <Tile label="Conceded" value={dash(data.conceded)} />
              <Tile label="Saves" value={dash(data.saves)} />
            </>
          ) : (
            <>
              <Tile label="Goals" value={dash(data.goals)} />
              <Tile label="Assists" value={dash(data.assists)} />
            </>
          )}
          <Tile label="Yellow" value={<CardVal color="yellow" value={dash(data.yellow)} />} />
          <Tile label="Red" value={<CardVal color="red" value={dash(data.red)} />} />
          <Tile label="Fouls won" value={dash(data.foulsDrawn)} />
          <Tile label="Fouls made" value={dash(data.foulsCommitted)} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 16 },
  photo: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.surface3,
    borderWidth: 2,
    borderColor: colors.borderSolid,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  photoImg: { width: '100%', height: '100%', borderRadius: 34 },
  photoFallback: { fontFamily: fonts.heading, fontSize: 22, color: colors.textMuted },
  rating: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#c2410c',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  ratingText: { color: '#fff', fontFamily: fonts.bodySemiBold, fontSize: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  name: { fontFamily: fonts.heading, fontSize: 19, color: colors.text },
  capt: { backgroundColor: colors.accentGlow, borderRadius: 4, paddingHorizontal: 5 },
  captText: { fontFamily: fonts.headingBold, fontSize: 11, color: colors.accent },
  injured: { fontSize: 11, color: colors.error },
  meta: { fontSize: 13, color: colors.accentDim, marginTop: 3, fontFamily: fonts.bodyMedium },
  bio: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 7 },
  bioText: { fontSize: 12, color: colors.textMuted, fontFamily: fonts.body },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    width: '31.5%',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 12,
    borderRadius: 11,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileVal: { fontFamily: fonts.headingBold, fontSize: 22, color: colors.accent },
  cardVal: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tileLabel: { fontSize: 10, letterSpacing: 0.8, color: colors.textMuted, textTransform: 'uppercase', textAlign: 'center' },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 30 },
  emptyText: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 },
  nodata: { alignItems: 'center', gap: 8, paddingVertical: 20 },
})
