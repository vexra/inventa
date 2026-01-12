'use server'

import { revalidatePath } from 'next/cache'

import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'

import { auditLogs, units } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { unitSchema } from '@/lib/validations/unit'

export async function createUnit(data: unknown) {
  const session = await requireAuth({
    roles: ['super_admin'],
  })

  const parsed = unitSchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid' }

  const newUnitId = randomUUID()

  try {
    await db.transaction(async (tx) => {
      await tx.insert(units).values({
        id: newUnitId,
        facultyId: parsed.data.facultyId,
        name: parsed.data.name,
        description: parsed.data.description || null,
      })

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'CREATE',
        tableName: 'units',
        recordId: newUnitId,
        newValues: parsed.data,
      })
    })

    revalidatePath('/dashboard/units')
    return { success: true, message: 'Unit berhasil ditambahkan' }
  } catch (error) {
    console.error('Create unit error:', error)
    return { error: 'Gagal menambahkan unit' }
  }
}

export async function updateUnit(id: string, data: unknown) {
  const session = await requireAuth({
    roles: ['super_admin'],
  })

  const parsed = unitSchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid' }

  try {
    await db.transaction(async (tx) => {
      const [oldData] = await tx.select().from(units).where(eq(units.id, id)).limit(1)

      if (!oldData) throw new Error('Unit not found')

      await tx
        .update(units)
        .set({
          name: parsed.data.name,
          description: parsed.data.description || null,
          facultyId: parsed.data.facultyId,
        })
        .where(eq(units.id, id))

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'UPDATE',
        tableName: 'units',
        recordId: id,
        oldValues: oldData,
        newValues: parsed.data,
      })
    })

    revalidatePath('/dashboard/units')
    return { success: true, message: 'Data unit diperbarui' }
  } catch (error) {
    console.error('Update unit error:', error)
    return { error: 'Gagal memperbarui unit' }
  }
}

export async function deleteUnit(id: string) {
  const session = await requireAuth({
    roles: ['super_admin'],
  })

  try {
    await db.transaction(async (tx) => {
      const [oldData] = await tx.select().from(units).where(eq(units.id, id)).limit(1)

      if (!oldData) throw new Error('Unit not found')

      await tx.delete(units).where(eq(units.id, id))

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'DELETE',
        tableName: 'units',
        recordId: id,
        oldValues: oldData,
      })
    })

    revalidatePath('/dashboard/units')
    return { success: true, message: 'Unit dihapus' }
  } catch (error) {
    const dbError = error as { code?: string }

    // Error handling spesifik database (Postgres Error Code 23503: Foreign Key Violation)
    if (dbError.code === '23503') {
      return {
        error: 'Gagal hapus: Unit ini masih memiliki User atau Aset aktif.',
      }
    }
    return { error: 'Gagal menghapus unit' }
  }
}
