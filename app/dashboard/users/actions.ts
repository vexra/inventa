'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

import { randomUUID } from 'crypto'
import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'

import { auditLogs, requests, user } from '@/db/schema'
import { auth } from '@/lib/auth'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

const userFormSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter').or(z.literal('')).optional(),
  role: z.enum(['super_admin', 'faculty_admin', 'unit_admin', 'warehouse_staff', 'unit_staff']),
  unitId: z.string().optional(),
  warehouseId: z.string().optional(),
})

function getErrorMessage(error: unknown, defaultMessage: string): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'body' in error) {
    const errBody = (error as { body?: { message?: string } }).body
    if (errBody?.message) return errBody.message
  }
  return defaultMessage
}

export async function createUserAction(data: z.infer<typeof userFormSchema>) {
  const session = await requireAuth({ roles: ['super_admin'] })

  const parsed = userFormSchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid' }
  if (!parsed.data.password) return { error: 'Password wajib diisi untuk user baru' }

  try {
    const newUser = await auth.api.createUser({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
        name: parsed.data.name,
        // PERBAIKAN DI SINI: Gunakan 'as any' untuk bypass validasi tipe role Better Auth
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        role: parsed.data.role as any,
      },
    })

    if (!newUser) return { error: 'Gagal membuat user di auth provider' }

    await db.transaction(async (tx) => {
      await tx
        .update(user)
        .set({
          unitId: parsed.data.unitId || null,
          warehouseId: parsed.data.warehouseId || null,
          emailVerified: true,
          role: parsed.data.role,
        })
        .where(eq(user.id, newUser.user.id))

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'CREATE',
        tableName: 'user',
        recordId: newUser.user.id,
        newValues: {
          name: parsed.data.name,
          email: parsed.data.email,
          role: parsed.data.role,
          unitId: parsed.data.unitId,
          warehouseId: parsed.data.warehouseId,
        },
      })
    })

    revalidatePath('/dashboard/users')
    return { success: true, message: 'Pengguna berhasil dibuat' }
  } catch (e: unknown) {
    return { error: getErrorMessage(e, 'Gagal membuat pengguna') }
  }
}

export async function updateUserAction(id: string, data: z.infer<typeof userFormSchema>) {
  const session = await requireAuth({ roles: ['super_admin'] })

  const parsed = userFormSchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid' }

  const requestHeaders = await headers()

  try {
    const [oldData] = await db.select().from(user).where(eq(user.id, id)).limit(1)

    await auth.api.adminUpdateUser({
      body: {
        userId: id,
        data: {
          name: parsed.data.name,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          role: parsed.data.role as any,
        },
      },
      headers: requestHeaders,
    })

    if (parsed.data.password) {
      await auth.api.setUserPassword({
        body: {
          userId: id,
          newPassword: parsed.data.password,
        },
        headers: requestHeaders,
      })
    }

    await db.transaction(async (tx) => {
      await tx
        .update(user)
        .set({
          unitId: parsed.data.unitId || null,
          warehouseId: parsed.data.warehouseId || null,
          role: parsed.data.role,
        })
        .where(eq(user.id, id))

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'UPDATE',
        tableName: 'user',
        recordId: id,
        oldValues: oldData,
        newValues: { ...parsed.data, password: '[REDACTED]' },
      })
    })

    revalidatePath('/dashboard/users')
    return { success: true, message: 'Pengguna berhasil diperbarui' }
  } catch (e: unknown) {
    console.error(e)
    return { error: getErrorMessage(e, 'Gagal memperbarui pengguna') }
  }
}

export async function banUserAction(userId: string, reason?: string) {
  const session = await requireAuth({ roles: ['super_admin'] })

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(user)
        .set({
          banned: true,
          banReason: reason || 'Dinonaktifkan oleh Administrator',
        })
        .where(eq(user.id, userId))

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'UPDATE',
        tableName: 'user',
        recordId: userId,
        newValues: { banned: true, banReason: reason },
      })
    })

    const requestHeaders = await headers()
    try {
      await auth.api.revokeUserSessions({
        body: { userId },
        headers: requestHeaders,
      })
    } catch {}

    revalidatePath('/dashboard/users')
    return { success: true, message: 'User berhasil diblokir' }
  } catch (e: unknown) {
    return { error: getErrorMessage(e, 'Gagal memblokir user') }
  }
}

export async function unbanUserAction(userId: string) {
  const session = await requireAuth({ roles: ['super_admin'] })
  const requestHeaders = await headers()

  try {
    await auth.api.unbanUser({
      body: { userId },
      headers: requestHeaders,
    })

    await db.transaction(async (tx) => {
      await tx.update(user).set({ banned: false, banReason: null }).where(eq(user.id, userId))

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'UPDATE',
        tableName: 'user',
        recordId: userId,
        newValues: { banned: false },
      })
    })

    revalidatePath('/dashboard/users')
    return { success: true, message: 'User berhasil diaktifkan kembali' }
  } catch (e: unknown) {
    return { error: getErrorMessage(e, 'Gagal mengaktifkan user') }
  }
}

export async function deleteUserAction(userId: string) {
  const session = await requireAuth({ roles: ['super_admin'] })

  try {
    const usageCheck = await db
      .select({ count: sql<number>`count(*)` })
      .from(requests)
      .where(eq(requests.requesterId, userId))

    const isUsed = Number(usageCheck[0]?.count || 0) > 0

    if (isUsed) {
      return {
        error: 'User tidak dapat dihapus karena memiliki riwayat transaksi (Requests).',
      }
    }

    const [targetUser] = await db
      .select({ name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)

    const reqHeaders = await headers()
    await auth.api.removeUser({ body: { userId }, headers: reqHeaders })

    await db.insert(auditLogs).values({
      id: randomUUID(),
      userId: session.user.id,
      action: 'DELETE',
      tableName: 'user',
      recordId: userId,
      oldValues: targetUser,
    })

    revalidatePath('/dashboard/users')
    return { success: true, message: 'User berhasil dihapus permanen' }
  } catch (e: unknown) {
    if (typeof e === 'object' && e !== null && 'code' in e) {
      // Error code PostgreSQL foreign key constraint violation
      if ((e as { code: string }).code === '23503') {
        return { error: 'Gagal: User ini terikat dengan data lain (Audit/Unit/dll).' }
      }
    }
    return { error: getErrorMessage(e, 'Gagal menghapus user') }
  }
}
