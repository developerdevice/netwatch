import 'server-only'

import type { ActiveServerSessionSummary } from '@/lib/types'

export const SESSION_COOKIE_NAME = 'netwatch_session'

export interface MutableServerSession extends ActiveServerSessionSummary {
  sessionId: string
  password: string
  createdAt: number
  expiresAt: number
}

export interface SessionStore {
  get(sessionId: string): Promise<MutableServerSession | null>
  set(session: MutableServerSession): Promise<void>
  delete(sessionId: string): Promise<void>
  cleanupExpired(): Promise<void>
}
