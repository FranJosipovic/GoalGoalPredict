import { useState } from 'react'
import { Alert, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { useTranslation } from 'react-i18next'
import { resetInviteCode, kickGroupMember } from '../../api/groups'
import { useAuthStore } from '../../store/authStore'
import { colors, fonts, radius } from '../../theme'
import Icon from '../../components/Icon'
import type { GroupDetail } from '../../types'

// The PWA's origin — where invite links resolve. Override via EXPO_PUBLIC_WEB_URL.
const WEB_ORIGIN = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://goalgoalpredict.com'

export default function MembersTab({ group }: { group: GroupDetail }) {
  const user = useAuthStore((s) => s.user)
  const { t } = useTranslation()
  const isOwner = group.createdByUserId === user?.id

  const [inviteCode, setInviteCode] = useState(group.inviteCode)
  const [feedback, setFeedback] = useState('')
  const [resetting, setResetting] = useState(false)
  const [members, setMembers] = useState(group.members)
  const [kicking, setKicking] = useState<string | null>(null)

  const inviteLink = `${WEB_ORIGIN}/invite/${inviteCode}`
  const sorted = [...members].sort((a, b) => (a.role === 'Owner' ? -1 : b.role === 'Owner' ? 1 : 0))

  const flash = (msg: string) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(''), 2000)
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${t('groupDetail.shareText', { name: group.name })} ${inviteLink}`,
      })
    } catch {
      /* cancelled */
    }
  }

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(inviteCode)
    flash(t('groupDetail.codeCopied'))
  }

  const handleReset = () => {
    Alert.alert(t('groupDetail.confirmResetTitle'), t('groupDetail.confirmResetBody'), [
      { text: t('groupDetail.cancel'), style: 'cancel' },
      {
        text: t('groupDetail.reset'),
        style: 'destructive',
        onPress: async () => {
          setResetting(true)
          try {
            const updated = await resetInviteCode(group.id)
            setInviteCode(updated.inviteCode)
            flash(t('groupDetail.newLinkGenerated'))
          } catch {
            flash(t('groupDetail.resetLinkFailed'))
          } finally {
            setResetting(false)
          }
        },
      },
    ])
  }

  const handleKick = (userId: string, name: string) => {
    Alert.alert(t('groupDetail.confirmRemoveTitle'), t('groupDetail.confirmRemoveBody', { name }), [
      { text: t('groupDetail.cancel'), style: 'cancel' },
      {
        text: t('groupDetail.remove'),
        style: 'destructive',
        onPress: async () => {
          setKicking(userId)
          try {
            await kickGroupMember(group.id, userId)
            setMembers((prev) => prev.filter((m) => m.userId !== userId))
            flash(t('groupDetail.memberRemoved', { name }))
          } catch (e: any) {
            flash(e?.response?.data?.error ?? t('groupDetail.removeMemberFailed'))
          } finally {
            setKicking(null)
          }
        },
      },
    ])
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.section}>
      <TouchableOpacity style={styles.inviteBtn} onPress={handleShare}>
        <Icon name="link" size={18} color={colors.onAccent} />
        <Text style={styles.inviteBtnText}>{t('groupDetail.invitePeople')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.codeBtn} onPress={handleCopyCode}>
        <View>
          <Text style={styles.codeLabel}>{t('groupDetail.inviteCodeLabel')}</Text>
          <Text style={styles.code}>{inviteCode}</Text>
        </View>
        <Icon name="copy" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      {isOwner && (
        <TouchableOpacity style={styles.resetBtn} onPress={handleReset} disabled={resetting}>
          <Text style={styles.resetText}>{resetting ? t('groupDetail.resetting') : t('groupDetail.resetLink')}</Text>
        </TouchableOpacity>
      )}

      {!!feedback && <Text style={styles.feedback}>{feedback}</Text>}

      <View style={styles.membersHeader}>
        <Text style={styles.membersTitle}>{t('groupDetail.membersHeader')}</Text>
        <Text style={styles.membersCount}>{members.length}</Text>
      </View>

      <View style={styles.membersList}>
        {sorted.map((m) => (
          <View key={m.userId} style={styles.memberCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {m.firstName[0]}
                {m.lastName[0]}
              </Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName} numberOfLines={1}>
                {m.firstName} {m.lastName}
                {m.userId === user?.id && <Text style={styles.memberYou}> {t('groupDetail.youParen')}</Text>}
              </Text>
            </View>
            {m.role === 'Owner' && (
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{t('groupDetail.roleOwner')}</Text>
              </View>
            )}
            {isOwner && m.role !== 'Owner' && m.userId !== user?.id && (
              <TouchableOpacity
                style={styles.kickBtn}
                onPress={() => handleKick(m.userId, `${m.firstName} ${m.lastName}`)}
                disabled={kicking === m.userId}
              >
                <Text style={styles.kickText}>{kicking === m.userId ? '…' : '✕'}</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  section: { padding: 20, paddingBottom: 40 },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: 14,
  },
  inviteBtnText: { fontFamily: fonts.heading, fontSize: 14, letterSpacing: 1, color: colors.onAccent },
  codeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    alignSelf: 'center',
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.borderSolid,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  codeLabel: { fontFamily: fonts.body, fontSize: 11, letterSpacing: 1, color: colors.textMuted },
  code: { fontFamily: fonts.headingBold, fontSize: 18, letterSpacing: 3, color: colors.accent },
  resetBtn: { alignItems: 'center', paddingVertical: 10 },
  resetText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textMuted },
  feedback: { textAlign: 'center', marginTop: 8, color: colors.accent, fontFamily: fonts.body, fontSize: 13 },

  membersHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24, marginBottom: 16 },
  membersTitle: { fontFamily: fonts.heading, fontSize: 14, letterSpacing: 1.8, color: colors.textMuted },
  membersCount: {
    fontFamily: fonts.headingBold,
    fontSize: 13,
    color: colors.accent,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  membersList: { gap: 10 },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.surface3,
    borderWidth: 1,
    borderColor: colors.borderSolid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.heading, fontSize: 14, color: colors.accent },
  memberInfo: { flex: 1, minWidth: 0 },
  memberName: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
  memberYou: { color: colors.accent, fontSize: 13 },
  roleBadge: {
    backgroundColor: colors.accentGlow,
    borderWidth: 1,
    borderColor: colors.borderSolid,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleBadgeText: { fontFamily: fonts.headingBold, fontSize: 10, letterSpacing: 1, color: colors.accent },
  kickBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSolid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kickText: { color: colors.textMuted, fontSize: 14 },
})
