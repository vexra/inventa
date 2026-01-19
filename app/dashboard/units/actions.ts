'use server'

import { revalidatePath } from 'next/cache'

import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'

import { auditLogs, units } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { unitSchema } from '@/lib/validations/unit'

async function validateUnitAccess(user: any, targetFacultyId: string) {
  if (user.role === 'super_admin') return true
  if (user.role === 'faculty_admin') {
    return user.facultyId === targetFacultyId
  }
  return false
}

export async function createUnit(data: unknown) {
  const session = await requireAuth({
    roles: ['super_admin', 'faculty_admin'],
  })

  const parsed = unitSchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid' }

  const hasAccess = await validateUnitAccess(session.user, parsed.data.facultyId)
  if (!hasAccess) {
    return { error: 'Anda tidak memiliki izin membuat unit di fakultas ini.' }
  }

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
    roles: ['super_admin', 'faculty_admin'],
  })

  const parsed = unitSchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid' }

  try {
    await db.transaction(async (tx) => {
      const [oldData] = await tx.select().from(units).where(eq(units.id, id)).limit(1)

      if (!oldData) throw new Error('Unit not found')

      if (session.user.role === 'faculty_admin' && oldData.facultyId !== session.user.facultyId) {
        throw new Error('Unauthorized access')
      }

      if (parsed.data.facultyId !== oldData.facultyId) {
        const canMove = await validateUnitAccess(session.user, parsed.data.facultyId)
        if (!canMove) throw new Error('Anda tidak bisa memindahkan unit ke fakultas lain.')
      }

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
  } catch (error: any) {
    console.error('Update unit error:', error)
    return { error: error.message || 'Gagal memperbarui unit' }
  }
}

export async function deleteUnit(id: string) {
  const session = await requireAuth({
    roles: ['super_admin', 'faculty_admin'],
  })

  try {
    await db.transaction(async (tx) => {
      const [oldData] = await tx.select().from(units).where(eq(units.id, id)).limit(1)

      if (!oldData) throw new Error('Unit not found')

      if (session.user.role === 'faculty_admin' && oldData.facultyId !== session.user.facultyId) {
        throw new Error('Unauthorized delete')
      }

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
    const dbError = error as { code?: string; message?: string }

    if (dbError.code === '23503') {
      return {
        error: 'Gagal hapus: Unit ini masih memiliki User atau Aset aktif.',
      }
    }
    return { error: dbError.message || 'Gagal menghapus unit' }
  }
}
