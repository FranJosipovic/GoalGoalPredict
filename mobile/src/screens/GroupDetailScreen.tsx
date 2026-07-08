import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getGroupDetail } from '../api/groups'
import { colors, fonts } from '../theme'
import Icon, { type IconName } from '../components/Icon'
import MatchesTab from './groupDetail/MatchesTab'
import PicksTab from './groupDetail/PicksTab'
import LeaderboardTab from './groupDetail/LeaderboardTab'
import MembersTab from './groupDetail/MembersTab'
import RulesTab from './groupDetail/RulesTab'
import type { GroupDetail } from '../types'
import type { ScreenProps } from '../navigation'

type Tab = 'matches' | 'mypicks' | 'leaderboard' | 'members' | 'rules'

const TAB_META: Record<Tab, { icon: IconName; label: string }> = {
  matches: { icon: 'ball', label: 'Matches' },
  mypicks: { icon: 'target', label: 'Picks' },
  leaderboard: { icon: 'trophy', label: 'Board' },
  members: { icon: 'users', label: 'Members' },
  rules: { icon: 'sliders', label: 'Rules' },
}

const FULL_TABS: Tab[] = ['matches', 'mypicks', 'leaderboard', 'members', 'rules']
const GLOBAL_TABS: Tab[] = ['matches', 'leaderboard', 'rules']
const GLOBAL_TABS_UNLOCKED: Tab[] = ['matches', 'mypicks', 'leaderboard', 'rules']

export function GroupDetailScreen({ route, navigation }: ScreenProps<'GroupDetail'>) {
  const { groupId, groupName } = route.params
  const insets = useSafeAreaInsets()
  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('matches')

  useEffect(() => {
    getGroupDetail(groupId)
      .then(setGroup)
      .finally(() => setLoading(false))
  }, [groupId])

  const tabs = useMemo(() => {
    if (!group?.isGlobal) return FULL_TABS
    return group.isLocked ? GLOBAL_TABS : GLOBAL_TABS_UNLOCKED
  }, [group?.isGlobal, group?.isLocked])

  // Live/finished → read-only detail view; upcoming → the prediction editor.
  const onMatchClick = (matchId: number, openDetail: boolean) =>
    navigation.navigate(openDetail ? 'MatchDetail' : 'MatchPredict', { matchId, groupId })

  // Horizontal swipe left/right switches tabs. Refs keep the responder reading the
  // latest tab/tabs without being recreated each render.
  const tabRef = useRef(tab)
  tabRef.current = tab
  const tabsRef = useRef(tabs)
  tabsRef.current = tabs
  const pan = useRef(
    PanResponder.create({
      // Only claim clearly-horizontal drags so vertical scrolling still works.
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
      onPanResponderRelease: (_e, g) => {
        if (Math.abs(g.dx) < 50) return
        const t = tabsRef.current
        const i = t.indexOf(tabRef.current)
        const next = g.dx < 0 ? i + 1 : i - 1
        if (next >= 0 && next < t.length) setTab(t[next])
      },
    })
  ).current

  return (
    <View style={styles.root}>
      {/* Header: back · title · home */}
      <View style={[styles.header, { paddingTop: insets.top, height: 56 + insets.top }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Icon name="back" size={20} color={colors.textMuted} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {group?.name ?? groupName}
        </Text>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Groups')}>
          <Icon name="home" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={styles.tabs}>
        {tabs.map((t) => {
          const active = t === tab
          const color = active ? colors.accent : colors.textMuted
          return (
            <TouchableOpacity key={t} style={styles.tab} onPress={() => setTab(t)} activeOpacity={0.7}>
              <Icon name={TAB_META[t].icon} size={18} color={color} />
              <Text style={[styles.tabLabel, { color }]}>{TAB_META[t].label}</Text>
              {active && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Content */}
      <View style={styles.content} {...pan.panHandlers}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
        ) : tab === 'matches' ? (
          <MatchesTab groupId={groupId} isGlobal={group?.isGlobal} onMatchClick={onMatchClick} />
        ) : tab === 'mypicks' ? (
          <PicksTab groupId={groupId} onMatchClick={onMatchClick} />
        ) : tab === 'leaderboard' ? (
          <LeaderboardTab groupId={groupId} />
        ) : tab === 'members' && group ? (
          <MembersTab group={group} />
        ) : tab === 'rules' ? (
          <RulesTab groupId={groupId} />
        ) : (
          <ComingSoon label={TAB_META[tab].label} />
        )}
      </View>
    </View>
  )
}

function ComingSoon({ label }: { label: string }) {
  return (
    <View style={styles.soon}>
      <Text style={styles.soonEmoji}>🚧</Text>
      <Text style={styles.soonTitle}>{label}</Text>
      <Text style={styles.soonSub}>Coming soon to mobile</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: colors.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBtn: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.heading,
    fontSize: 18,
    letterSpacing: 0.5,
    color: colors.text,
    marginHorizontal: 8,
  },
  tabs: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, paddingBottom: 11 },
  tabLabel: { fontFamily: fonts.body, fontSize: 11, letterSpacing: 0.2 },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    width: '60%',
    backgroundColor: colors.accent,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  content: { flex: 1 },
  soon: { alignItems: 'center', paddingVertical: 60 },
  soonEmoji: { fontSize: 44, marginBottom: 16 },
  soonTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.text, marginBottom: 8 },
  soonSub: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
})
