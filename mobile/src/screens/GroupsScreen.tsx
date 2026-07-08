import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { getGroups, createGroup, joinGroup } from '../api/groups'
import { useAuthStore } from '../store/authStore'
import { colors, fonts, radius } from '../theme'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import Icon from '../components/Icon'
import type { Group } from '../types'
import type { ScreenProps } from '../navigation'

export function GroupsScreen({ navigation }: ScreenProps<'Groups'>) {
  const user = useAuthStore((s) => s.user)
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  const [modal, setModal] = useState<'create' | 'join' | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    getGroups()
      .then(setGroups)
      .finally(() => setLoading(false))
  }, [])

  const openModal = (type: 'create' | 'join') => {
    setModal(type)
    setInputValue('')
    setActionError('')
  }
  const closeModal = () => {
    setModal(null)
    setActionError('')
  }

  const handleAction = async () => {
    if (!inputValue.trim()) return
    setActionError('')
    setActionLoading(true)
    try {
      const group =
        modal === 'create'
          ? await createGroup(inputValue.trim())
          : await joinGroup(inputValue.trim().toUpperCase())
      setGroups((g) => [group, ...g])
      closeModal()
    } catch (err: any) {
      setActionError(err?.response?.data?.error ?? 'Something went wrong.')
    } finally {
      setActionLoading(false)
    }
  }

  const openGroup = (g: Group) =>
    navigation.navigate('GroupDetail', { groupId: g.id, groupName: g.name })

  return (
    <View style={styles.root}>
      <Header />

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Hero */}
        <LinearGradient colors={[colors.surface, 'transparent']} style={styles.hero}>
          <Text style={styles.heroGreeting}>
            WELCOME BACK, <Text style={styles.heroName}>{user?.firstName?.toUpperCase()}</Text>
          </Text>
          <Text style={styles.heroTitle}>Your Competitions</Text>
          <Text style={styles.heroSub}>Predict. Compete. Win.</Text>
        </LinearGradient>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => openModal('create')}>
            <Icon name="plus" size={16} color={colors.onAccent} />
            <Text style={[styles.btnText, styles.btnPrimaryText]}>Create group</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => openModal('join')}>
            <Icon name="users" size={16} color={colors.text} />
            <Text style={[styles.btnText, styles.btnSecondaryText]}>Join group</Text>
          </TouchableOpacity>
        </View>

        {/* List */}
        <View style={styles.list}>
          {loading && (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          )}

          {!loading && groups.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🏆</Text>
              <Text style={styles.emptyTitle}>No competitions yet</Text>
              <Text style={styles.emptySub}>Create one or join with an invite code</Text>
            </View>
          )}

          {groups.map((g) =>
            g.isGlobal ? (
              <GlobalCard key={g.id} group={g} onPress={() => openGroup(g)} />
            ) : (
              <RegularCard key={g.id} group={g} onPress={() => openGroup(g)} />
            )
          )}
        </View>
      </ScrollView>

      <BottomNav active="groups" />

      {/* Create / Join modal */}
      <Modal visible={!!modal} transparent animationType="slide" onRequestClose={closeModal}>
        <Pressable style={styles.overlay} onPress={closeModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.overlayInner}
          >
            <Pressable style={styles.modal} onPress={() => {}}>
              <Text style={styles.modalTitle}>
                {modal === 'create' ? 'New Competition' : 'Join Competition'}
              </Text>
              <Text style={styles.modalSub}>
                {modal === 'create' ? 'Give your group a name' : 'Enter the 6-character invite code'}
              </Text>
              <TextInput
                style={styles.field}
                value={inputValue}
                onChangeText={setInputValue}
                placeholder={modal === 'create' ? 'Champions League Pub League' : 'ABC123'}
                placeholderTextColor={colors.textMuted}
                maxLength={modal === 'join' ? 6 : 60}
                autoCapitalize={modal === 'join' ? 'characters' : 'sentences'}
                autoFocus
                onSubmitEditing={handleAction}
              />
              {!!actionError && (
                <View style={styles.errorMsg}>
                  <Text style={styles.errorText}>{actionError}</Text>
                </View>
              )}
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.btnGhost} onPress={closeModal}>
                  <Text style={styles.btnGhostText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary, { flex: 1 }, actionLoading && { opacity: 0.5 }]}
                  onPress={handleAction}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator color={colors.onAccent} />
                  ) : (
                    <Text style={[styles.btnText, styles.btnPrimaryText]}>
                      {modal === 'create' ? 'Create' : 'Join'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  )
}

function RegularCard({ group, onPress }: { group: Group; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardLeft}>
        <LinearGradient colors={[colors.surface3, colors.surface2]} style={styles.cardIcon}>
          <Text style={styles.cardIconText}>{group.name.charAt(0).toUpperCase()}</Text>
        </LinearGradient>
        <View>
          <Text style={styles.cardName}>{group.name}</Text>
          <Text style={styles.cardCode}>#{group.inviteCode}</Text>
        </View>
      </View>
      <Icon name="chevronRight" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  )
}

function GlobalCard({ group, onPress }: { group: Group; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <LinearGradient
        colors={['rgba(245, 197, 66, 0.14)', 'rgba(245, 197, 66, 0.04)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, styles.cardGlobal]}
      >
        <View style={styles.cardLeft}>
          <LinearGradient colors={[colors.goldBright, colors.goldDeep]} style={styles.cardIcon}>
            {group.isLocked ? (
              <Icon name="lock" size={22} color={colors.onGold} />
            ) : (
              <Text style={styles.cardIconEmoji}>🏆</Text>
            )}
          </LinearGradient>
          <View>
            <View style={styles.globalNameRow}>
              <Text style={styles.cardNameGlobal}>{group.name}</Text>
              <View style={styles.globalBadge}>
                <Text style={styles.globalBadgeText}>GLOBAL</Text>
              </View>
            </View>
            <Text style={styles.cardSubGlobal}>
              {group.isLocked ? 'Unlocks at the knockout phase' : 'Everyone competes · live now'}
            </Text>
          </View>
        </View>
        <Icon name="chevronRight" size={20} color={colors.gold} />
      </LinearGradient>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  hero: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 28, borderBottomWidth: 1, borderBottomColor: colors.border },
  heroGreeting: { fontFamily: fonts.heading, fontSize: 12, letterSpacing: 2.4, color: colors.textMuted, marginBottom: 8 },
  heroName: { color: colors.accent },
  heroTitle: { fontFamily: fonts.headingBold, fontSize: 32, color: colors.text, lineHeight: 35 },
  heroSub: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, marginTop: 6, fontStyle: 'italic' },

  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 20 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.sm,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  btnPrimary: { flex: 1, backgroundColor: colors.accent },
  btnSecondary: { flex: 1, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  btnText: { fontFamily: fonts.heading, fontSize: 13, letterSpacing: 1 },
  btnPrimaryText: { color: colors.onAccent },
  btnSecondaryText: { color: colors.text },

  list: { paddingHorizontal: 20, paddingTop: 20, gap: 12 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 16,
  },
  cardGlobal: { borderColor: 'rgba(245, 197, 66, 0.45)' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSolid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconText: { fontFamily: fonts.heading, fontSize: 20, color: colors.accent },
  cardIconEmoji: { fontSize: 20 },
  cardName: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text, marginBottom: 3 },
  cardCode: { fontFamily: fonts.heading, fontSize: 12, letterSpacing: 1.4, color: colors.accent, opacity: 0.7 },

  globalNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  cardNameGlobal: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.goldBright },
  globalBadge: { backgroundColor: colors.goldBright, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  globalBadgeText: { fontFamily: fonts.headingBold, fontSize: 9, letterSpacing: 1.3, color: colors.onGold },
  cardSubGlobal: { fontFamily: fonts.heading, fontSize: 12, letterSpacing: 0.7, color: colors.gold, opacity: 0.85 },

  loadingState: { paddingVertical: 60, alignItems: 'center' },
  emptyState: { paddingVertical: 60, alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.text, marginBottom: 8 },
  emptySub: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  overlayInner: { justifyContent: 'flex-end' },
  modal: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSolid,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 32,
    gap: 14,
  },
  modalTitle: { fontFamily: fonts.heading, fontSize: 22, color: colors.text },
  modalSub: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, marginTop: -8 },
  field: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.text,
  },
  errorMsg: {
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: 'rgba(255, 95, 87, 0.3)',
    borderRadius: radius.sm,
    padding: 10,
  },
  errorText: { color: colors.error, fontSize: 13, fontFamily: fonts.body },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btnGhost: { paddingHorizontal: 16, paddingVertical: 14, justifyContent: 'center' },
  btnGhostText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textMuted },
})
