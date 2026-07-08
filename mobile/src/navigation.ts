import type { NativeStackScreenProps } from '@react-navigation/native-stack'

// Central route map. Add screens here as we build them (MatchPredict, Live, ...).
export type RootStackParamList = {
  Groups: undefined
  GroupDetail: { groupId: string; groupName: string }
  MatchDetail: { matchId: number; groupId: string }
  MatchPredict: { matchId: number; groupId: string }
  MemberDetail: { groupId: string; userId: string; name: string; isMe: boolean }
  Tournament: undefined
  Admin: undefined
}

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>
