'use server'

import { headers } from 'next/headers'

import { auth } from '@/lib/auth'
import { requireAuth } from '@/lib/auth-guard'

export async function getUserSessionsAction(userId: string) {
  await requireAuth({ roles: ['administrator'] })

  try {
    const response = await auth.api.listUserSessions({
      body: { userId },
      headers: await headers(),
    })
    return { success: true, data: response }
  } catch {
    return { success: false, error: 'Gagal mengambil data sesi.' }
  }
}

export async function revokeSessionAction(sessionToken: string) {
  await requireAuth({ roles: ['administrator'] })

  try {
    await auth.api.revokeUserSession({
      body: { sessionToken },
      headers: await headers(),
    })
    return { success: true, message: 'Sesi berhasil dicabut.' }
  } catch {
    return { success: false, error: 'Gagal mencabut sesi.' }
  }
}

export async function revokeAllSessionsAction(userId: string) {
  await requireAuth({ roles: ['administrator'] })

  try {
    await auth.api.revokeUserSessions({
      body: { userId },
      headers: await headers(),
    })
    return { success: true, message: 'Semua sesi pengguna berhasil dicabut.' }
  } catch {
    return { success: false, error: 'Gagal mencabut semua sesi.' }
  }
}
