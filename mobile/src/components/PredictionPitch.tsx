import { useState, type ReactNode } from 'react'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { colors, fonts } from '../theme'
import type { LineupPlayer } from '../types'

const POS_LETTER = (pos: string) => {
  const p = (pos[0] ?? 'M').toUpperCase()
  return p === 'A' ? 'F' : p
}
const ROW_ORDER = ['G', 'D', 'M', 'F']
const lastName = (name: string) => name.split(' ').pop() ?? name
const initialsOf = (name: string) => {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

export interface PlayerBadge {
  icon: ReactNode
  count?: number
}

interface Props {
  players: LineupPlayer[]
  bench?: LineupPlayer[]
  badgesFor: (playerId: number) => PlayerBadge[]
  onPlayerTap: (playerId: number) => void
  bench_?: boolean
}

function Avatar({ p, badges, small }: { p: LineupPlayer; badges: PlayerBadge[]; small?: boolean }) {
  const [failed, setFailed] = useState(false)
  const showImg = p.photoUrl && !failed
  const size = small ? 38 : 46
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }, badges.length > 0 && styles.avatarPicked]}>
      {showImg ? (
        <Image
          source={{ uri: p.photoUrl }}
          style={[styles.avatarImg, { borderRadius: size / 2 }]}
          onError={() => setFailed(true)}
        />
      ) : (
        <Text style={styles.avatarFallback}>{initialsOf(p.name)}</Text>
      )}
      <View style={styles.shirt}>
        <Text style={styles.shirtText}>{p.shirtNumber}</Text>
      </View>
      {badges.length > 0 && (
        <View style={styles.badges}>
          {badges.map((b, i) => (
            <View key={i} style={styles.badge}>
              {b.icon}
              {b.count && b.count > 1 ? <Text style={styles.badgeCount}>{b.count}</Text> : null}
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

export default function PredictionPitch({ players, bench = [], badgesFor, onPlayerTap }: Props) {
  const rows = ROW_ORDER.map((code) => players.filter((p) => POS_LETTER(p.position) === code)).filter(
    (r) => r.length > 0
  )

  return (
    <View>
      <View style={styles.field}>
        {/* Markings */}
        <View style={styles.halfLine} />
        <View style={styles.centerCircle} />
        <View style={styles.centerSpot} />
        <View style={[styles.box, styles.boxTop]} />
        <View style={[styles.box, styles.boxBottom]} />

        {/* Attackers at top, GK at bottom */}
        {[...rows].reverse().map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((p) => (
              <TouchableOpacity key={p.playerId} style={styles.token} onPress={() => onPlayerTap(p.playerId)} activeOpacity={0.8}>
                <Avatar p={p} badges={badgesFor(p.playerId)} />
                <Text style={styles.name} numberOfLines={1}>
                  {lastName(p.name)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      {bench.length > 0 && (
        <View style={styles.bench}>
          <View style={styles.benchLabel}>
            <View style={styles.benchDot} />
            <Text style={styles.benchLabelText}>SUBSTITUTES</Text>
            <Text style={styles.benchCount}>{bench.length}</Text>
          </View>
          <View style={{ gap: 4 }}>
            {bench.map((p) => {
              const badges = badgesFor(p.playerId)
              return (
                <TouchableOpacity
                  key={p.playerId}
                  style={[styles.benchRow, badges.length > 0 && styles.benchRowPicked]}
                  onPress={() => onPlayerTap(p.playerId)}
                  activeOpacity={0.8}
                >
                  <Avatar p={p} badges={badges} small />
                  <Text style={styles.benchName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text style={styles.benchPos}>{POS_LETTER(p.position)}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      )}
    </View>
  )
}

const LINE = 'rgba(255,255,255,0.18)'

const styles = StyleSheet.create({
  field: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 10,
    backgroundColor: '#123a1f',
    borderWidth: 1,
    borderColor: 'rgba(184,255,106,0.12)',
    gap: 6,
  },
  halfLine: { position: 'absolute', top: '50%', left: 10, right: 10, height: 1, backgroundColor: LINE },
  centerCircle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 96,
    height: 96,
    marginLeft: -48,
    marginTop: -48,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 48,
  },
  centerSpot: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 5,
    height: 5,
    marginLeft: -2.5,
    marginTop: -2.5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  box: { position: 'absolute', left: '50%', width: 150, marginLeft: -75, height: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  boxTop: { top: 0, borderTopWidth: 0 },
  boxBottom: { bottom: 0, borderBottomWidth: 0 },

  row: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'flex-start', gap: 4, zIndex: 1 },
  token: { alignItems: 'center', gap: 6, width: 64 },
  name: {
    maxWidth: 66,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowRadius: 3,
  },

  avatar: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b2014',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  avatarPicked: { borderColor: colors.accent },
  avatarImg: { width: '100%', height: '100%' },
  avatarFallback: { fontFamily: fonts.heading, fontSize: 15, color: 'rgba(255,255,255,0.92)' },
  shirt: {
    position: 'absolute',
    bottom: -4,
    right: -5,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 4,
    borderRadius: 9.5,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shirtText: { fontFamily: fonts.heading, fontSize: 10, color: colors.accent },
  badges: { position: 'absolute', top: -6, left: -7, gap: 2, zIndex: 3 },
  badge: { flexDirection: 'row', alignItems: 'center' },
  badgeCount: { fontFamily: fonts.heading, fontSize: 9, color: '#fff' },

  bench: {
    marginTop: 14,
    padding: 14,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
  },
  benchLabel: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  benchDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  benchLabelText: { fontFamily: fonts.heading, fontSize: 11, letterSpacing: 1.6, color: colors.textMuted },
  benchCount: { marginLeft: 'auto', fontFamily: fonts.heading, fontSize: 11, color: colors.accent },
  benchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 11,
  },
  benchRowPicked: { backgroundColor: colors.accentGlow, borderColor: colors.accentDim },
  benchName: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 13.5, color: colors.text },
  benchPos: { fontFamily: fonts.heading, fontSize: 11, color: colors.textMuted, width: 22, textAlign: 'center' },
})
