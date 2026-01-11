'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

import { randomUUID } from 'crypto'

import { auditLogs } from '@/db/schema'
import { auth } from '@/lib/auth'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

export async function getUserSessionsAction(userId: string) {
  await requireAuth({ roles: ['super_admin'] })

  try {
    const response = await auth.api.listUserSessions({
      body: { userId },
      headers: await headers(),
    })
    return { success: true, data: response }
  } catch (error) {
    return { success: false, error: 'Gagal mengambil data sesi.' }
  }
}

export async function revokeSessionAction(sessionToken: string, userId: string) {
  const adminSession = await requireAuth({ roles: ['super_admin'] })

  try {
    await db.transaction(async (tx) => {
      await auth.api.revokeUserSession({
        body: { sessionToken },
        headers: await headers(),
      })

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: adminSession.user.id,
        action: 'DELETE',
        tableName: 'session',
        recordId: sessionToken,
        oldValues: {
          token_preview: `${sessionToken.substring(0, 10)}...`,
          target_user_id: userId,
        },
      })
    })

    revalidatePath('/dashboard/sessions')
    return { success: true, message: 'Sesi berhasil dicabut.' }
  } catch (error) {
    console.error('Revoke session error:', error)
    return { success: false, error: 'Gagal mencabut sesi.' }
  }
}

export async function revokeAllSessionsAction(userId: string) {
  const adminSession = await requireAuth({ roles: ['super_admin'] })

  try {
    await db.transaction(async (tx) => {
      await auth.api.revokeUserSessions({
        body: { userId },
        headers: await headers(),
      })

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: adminSession.user.id,
        action: 'DELETE_ALL_SESSIONS',
        tableName: 'session',
        recordId: userId,
        newValues: { description: 'Force logout all devices' },
      })
    })

    revalidatePath('/dashboard/sessions')
    return { success: true, message: 'Semua sesi pengguna berhasil dicabut.' }
  } catch (error) {
    console.error('Revoke all sessions error:', error)
    return { success: false, error: 'Gagal mencabut semua sesi.' }
  }
}
