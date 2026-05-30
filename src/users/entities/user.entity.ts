export type AuthProvider = 'password' | 'google'

export interface User {
  uid: string
  firstName: string
  lastName: string
  email: string
  username?: string
  avatarUrl?: string
  authProvider: AuthProvider
  profileComplete: boolean
  createdAt: string
  updatedAt: string
}

export interface UsernameRecord {
  uid: string
}
