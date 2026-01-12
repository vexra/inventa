'use server'

import { revalidatePath } from 'next/cache'

import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'

import { auditLogs, faculties } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { facultySchema } from '@/lib/validations/faculty'

export async function createFaculty(data: unknown) {
  const session = await requireAuth({
    roles: ['super_admin'],
  })

  const parsed = facultySchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid' }

  const newId = randomUUID()

  try {
    await db.transaction(async (tx) => {
      await tx.insert(faculties).values({
        id: newId,
        name: parsed.data.name,
        description: parsed.data.description || null,
      })

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'CREATE',
        tableName: 'faculties',
        recordId: newId,
        newValues: parsed.data,
      })
    })

    revalidatePath('/dashboard/faculties')
    return { success: true, message: 'Fakultas berhasil ditambahkan' }
  } catch (error) {
    console.error('Create faculty error:', error)
    return { error: 'Gagal menambahkan fakultas' }
  }
}

export async function updateFaculty(id: string, data: unknown) {
  const session = await requireAuth({
    roles: ['super_admin'],
  })

  const parsed = facultySchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid' }

  try {
    await db.transaction(async (tx) => {
      const [oldData] = await tx.select().from(faculties).where(eq(faculties.id, id)).limit(1)

      if (!oldData) throw new Error('Faculty not found')

      await tx
        .update(faculties)
        .set({
          name: parsed.data.name,
          description: parsed.data.description || null,
        })
        .where(eq(faculties.id, id))

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'UPDATE',
        tableName: 'faculties',
        recordId: id,
        oldValues: oldData,
        newValues: parsed.data,
      })
    })

    revalidatePath('/dashboard/faculties')
    return { success: true, message: 'Data fakultas diperbarui' }
  } catch (error) {
    console.error('Update faculty error:', error)
    return { error: 'Gagal memperbarui fakultas' }
  }
}

export async function deleteFaculty(id: string) {
  const session = await requireAuth({
    roles: ['super_admin'],
  })

  try {
    await db.transaction(async (tx) => {
      const [oldData] = await tx.select().from(faculties).where(eq(faculties.id, id)).limit(1)

      if (!oldData) throw new Error('Faculty not found')

      await tx.delete(faculties).where(eq(faculties.id, id))

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'DELETE',
        tableName: 'faculties',
        recordId: id,
        oldValues: oldData,
      })
    })

    revalidatePath('/dashboard/faculties')
    return { success: true, message: 'Fakultas dihapus' }
  } catch (error: any) {
    // Error handling foreign key (jika fakultas masih punya Unit)
    if (error.code === '23503') {
      return { error: 'Gagal hapus: Fakultas ini masih memiliki Unit aktif.' }
    }
    return { error: 'Gagal menghapus fakultas' }
  }
}
