export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
}

export interface Group {
  id: string
  name: string
  inviteCode: string
  createdByUserId: string
  createdAt: string
}

export interface GroupMember {
  userId: string
  firstName: string
  lastName: string
  email: string
  role: 'Owner' | 'Member'
}

export interface GroupDetail extends Group {
  members: GroupMember[]
}

export interface AuthResponse {
  token: string
  user: User
}
