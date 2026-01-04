'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { user } from '@/db/schema'
import { auth } from '@/lib/auth'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

const userFormSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  password: z.string().min(8).or(z.literal('')).optional(),
  role: z.enum(['administrator', 'warehouse_staff', 'unit_staff', 'executive']),
  unitId: z.string().optional(),
  warehouseId: z.string().optional(),
})

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
  } catch (e: any) {
    return { error: e.message || 'Gagal membuat pengguna' }
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
  } catch (e: any) {
    return { error: e.body?.message || e.message || 'Gagal memperbarui pengguna' }
  }
}

export async function banUserAction(userId: string) {
  await requireAuth({ roles: ['administrator'] })
  const requestHeaders = await headers()

  try {
    await auth.api.banUser({
      body: {
        userId: userId,
        banReason: 'Dinonaktifkan oleh Administrator',
      },
      headers: requestHeaders,
    })

    revalidatePath('/dashboard/users')
    return { success: true, message: 'User berhasil diblokir' }
  } catch (e: any) {
    return { error: e.body?.message || 'Gagal memblokir user' }
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
  } catch (e: any) {
    return { error: e.body?.message || 'Gagal mengaktifkan user' }
  }
}
