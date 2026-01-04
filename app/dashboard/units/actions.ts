'use server'

import { revalidatePath } from 'next/cache'

import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'

import { units } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { unitSchema } from '@/lib/validations/unit'

export async function createUnit(data: unknown) {
  await requireAuth({
    roles: ['administrator'],
  })

  const parsed = unitSchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid' }

  try {
    await db.insert(units).values({
      id: randomUUID(),
      name: parsed.data.name,
      description: parsed.data.description || null,
    })
    revalidatePath('/dashboard/units')
    return { success: true, message: 'Unit berhasil ditambahkan' }
  } catch {
    return { error: 'Gagal menambahkan unit' }
  }
}

export async function updateUnit(id: string, data: unknown) {
  await requireAuth({
    roles: ['administrator'],
  })

  const parsed = unitSchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid' }

  try {
    await db
      .update(units)
      .set({
        name: parsed.data.name,
        description: parsed.data.description || null,
      })
      .where(eq(units.id, id))

    revalidatePath('/dashboard/units')
    return { success: true, message: 'Data unit diperbarui' }
  } catch {
    return { error: 'Gagal memperbarui unit' }
  }
}

export async function deleteUnit(id: string) {
  await requireAuth({
    roles: ['administrator'],
  })

  try {
    await db.delete(units).where(eq(units.id, id))
    revalidatePath('/dashboard/units')
    return { success: true, message: 'Unit dihapus' }
  } catch {
    return { error: 'Gagal menghapus unit (mungkin sedang digunakan)' }
  }
}
