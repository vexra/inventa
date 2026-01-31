'use server'

import { revalidatePath } from 'next/cache'

import { and, count, eq } from 'drizzle-orm'

import { notifications } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

export async function getUnreadCount() {
  const session = await requireAuth()

  try {
    const [result] = await db
      .select({ value: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, session.user.id), eq(notifications.isRead, false)))

    return result?.value || 0
  } catch {
    return 0
  }
}

export async function markAsRead(id: string) {
  const session = await requireAuth()

  try {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, session.user.id)))

    revalidatePath('/dashboard/notifications')
    return { success: true, message: 'Ditandai sudah dibaca' }
  } catch {
    return { error: 'Gagal update status' }
  }
}

export async function markAllAsRead() {
  const session = await requireAuth()

  try {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, session.user.id), eq(notifications.isRead, false)))

    revalidatePath('/dashboard/notifications')
    return { success: true, message: 'Semua notifikasi ditandai sudah dibaca' }
  } catch {
    return { error: 'Gagal memperbarui notifikasi' }
  }
}

export async function deleteNotification(id: string) {
  const session = await requireAuth()

  try {
    await db
      .delete(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, session.user.id)))

    revalidatePath('/dashboard/notifications')
    return { success: true, message: 'Notifikasi dihapus' }
  } catch {
    return { error: 'Gagal menghapus notifikasi' }
  }
}
