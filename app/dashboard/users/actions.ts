'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'

import { requests, user } from '@/db/schema'
import { auth } from '@/lib/auth'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

const userFormSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  password: z.string().min(8, 'Password minimal 8 karakter').or(z.literal('')).optional(),
  role: z.enum(['administrator', 'warehouse_staff', 'unit_staff', 'executive']),
  unitId: z.string().optional(),
  warehouseId: z.string().optional(),
})

// Helper untuk mengambil pesan error secara aman
function getErrorMessage(error: unknown, defaultMessage: string): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'body' in error) {
    // Asumsi error dari Better Auth mungkin punya properti body.message
    const errBody = (error as { body?: { message?: string } }).body
    if (errBody?.message) return errBody.message
  }
  return defaultMessage
}

export async function createUserAction(data: z.infer<typeof userFormSchema>) {
  await requireAuth({ roles: ['administrator'] })

  const parsed = userFormSchema.safeParse(data)

  if (!parsed.success) return { error: 'Data tidak valid' }
  if (!parsed.data.password) return { error: 'Password wajib diisi untuk user baru' }

  try {
    const newUser = await auth.api.createUser({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
        name: parsed.data.name,
      },
    })

    if (!newUser) return { error: 'Gagal membuat user di auth provider' }

    await db
      .update(user)
      .set({
        unitId: parsed.data.unitId || null,
        warehouseId: parsed.data.warehouseId || null,
        role: parsed.data.role,
        emailVerified: true,
      })
      .where(eq(user.id, newUser.user.id))

    revalidatePath('/dashboard/users')
    return { success: true, message: 'Pengguna berhasil dibuat' }
  } catch (e: unknown) {
    return { error: getErrorMessage(e, 'Gagal membuat pengguna') }
  }
}

export async function updateUserAction(id: string, data: z.infer<typeof userFormSchema>) {
  await requireAuth({ roles: ['administrator'] })

  const parsed = userFormSchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid' }

  const requestHeaders = await headers()

  try {
    await auth.api.adminUpdateUser({
      body: {
        userId: id,
        data: {
          name: parsed.data.name,
          unitId: parsed.data.unitId || null,
          warehouseId: parsed.data.warehouseId || null,
        },
      },
      headers: requestHeaders,
    })

    if (parsed.data.role) {
      await auth.api.setRole({
        body: {
          userId: id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          role: parsed.data.role as any,
        },
        headers: requestHeaders,
      })
    }

    if (parsed.data.password) {
      await auth.api.setUserPassword({
        body: {
          userId: id,
          newPassword: parsed.data.password,
        },
        headers: requestHeaders,
      })
    }

    revalidatePath('/dashboard/users')
    return { success: true, message: 'Pengguna berhasil diperbarui' }
  } catch (e: unknown) {
    return { error: getErrorMessage(e, 'Gagal memperbarui pengguna') }
  }
}

export async function banUserAction(userId: string, reason?: string) {
  await requireAuth({ roles: ['administrator'] })

  try {
    await db
      .update(user)
      .set({
        banned: true,
        banReason: reason || 'Dinonaktifkan oleh Administrator',
      })
      .where(eq(user.id, userId))

    const requestHeaders = await headers()
    try {
      await auth.api.revokeUserSessions({
        body: { userId },
        headers: requestHeaders,
      })
    } catch {
      // Ignore session revocation errors
    }

    revalidatePath('/dashboard/users')
    return { success: true, message: 'User berhasil diblokir' }
  } catch (e: unknown) {
    return { error: getErrorMessage(e, 'Gagal memblokir user') }
  }
}

export async function unbanUserAction(userId: string) {
  await requireAuth({ roles: ['administrator'] })
  const requestHeaders = await headers()

  try {
    await auth.api.unbanUser({
      body: { userId },
      headers: requestHeaders,
    })

    revalidatePath('/dashboard/users')
    return { success: true, message: 'User berhasil diaktifkan kembali' }
  } catch (e: unknown) {
    return { error: getErrorMessage(e, 'Gagal mengaktifkan user') }
  }
}

export async function deleteUserAction(userId: string) {
  await requireAuth({ roles: ['administrator'] })

  try {
    const usageCheck = await db
      .select({ count: sql<number>`count(*)` })
      .from(requests)
      .where(eq(requests.userId, userId))

    const isUsed = Number(usageCheck[0]?.count || 0) > 0

    if (isUsed) {
      return { error: 'User tidak dapat dihapus karena memiliki riwayat transaksi.' }
    }

    const reqHeaders = await headers()
    await auth.api.removeUser({ body: { userId }, headers: reqHeaders })

    revalidatePath('/dashboard/users')
    return { success: true, message: 'User berhasil dihapus permanen' }
  } catch (e: unknown) {
    if (typeof e === 'object' && e !== null && 'code' in e) {
      if ((e as { code: string }).code === '23503') {
        return { error: 'Gagal: User ini terikat dengan data lain.' }
      }
    }
    return { error: getErrorMessage(e, 'Gagal menghapus user') }
  }
}
