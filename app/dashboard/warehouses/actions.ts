'use server'

import { revalidatePath } from 'next/cache'

import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'

import { auditLogs, warehouses } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { warehouseSchema } from '@/lib/validations/warehouse'

export async function createWarehouse(data: unknown) {
  const session = await requireAuth({
    roles: ['super_admin', 'faculty_admin'],
  })

  const parsed = warehouseSchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid' }

  let facultyIdToSave = parsed.data.facultyId || null
  if (session.user.role === 'faculty_admin') {
    if (!session.user.facultyId) {
      return { error: 'Akun Anda tidak terhubung dengan fakultas manapun.' }
    }
    facultyIdToSave = session.user.facultyId
  }

  const newId = randomUUID()

  try {
    await db.transaction(async (tx) => {
      await tx.insert(warehouses).values({
        id: newId,
        name: parsed.data.name,
        type: parsed.data.type,
        facultyId: facultyIdToSave,
        description: parsed.data.description || null,
      })

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'CREATE',
        tableName: 'warehouses',
        recordId: newId,
        newValues: { ...parsed.data, facultyId: facultyIdToSave },
      })
    })

    revalidatePath('/dashboard/warehouses')
    return { success: true, message: 'Gudang berhasil ditambahkan' }
  } catch (error) {
    console.error('Create warehouse error:', error)
    return { error: 'Gagal menambahkan gudang' }
  }
}

export async function updateWarehouse(id: string, data: unknown) {
  const session = await requireAuth({
    roles: ['super_admin', 'faculty_admin'],
  })

  const parsed = warehouseSchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid' }

  try {
    await db.transaction(async (tx) => {
      const [oldData] = await tx.select().from(warehouses).where(eq(warehouses.id, id)).limit(1)

      if (!oldData) throw new Error('Warehouse not found')

      if (session.user.role === 'faculty_admin' && oldData.facultyId !== session.user.facultyId) {
        throw new Error('Unauthorized: Anda tidak memiliki akses ke gudang ini')
      }

      let facultyIdToSave = parsed.data.facultyId || null

      if (session.user.role === 'faculty_admin') {
        facultyIdToSave = session.user.facultyId || null
      }

      await tx
        .update(warehouses)
        .set({
          name: parsed.data.name,
          type: parsed.data.type,
          facultyId: facultyIdToSave,
          description: parsed.data.description || null,
        })
        .where(eq(warehouses.id, id))

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'UPDATE',
        tableName: 'warehouses',
        recordId: id,
        oldValues: oldData,
        newValues: { ...parsed.data, facultyId: facultyIdToSave },
      })
    })

    revalidatePath('/dashboard/warehouses')
    return { success: true, message: 'Data gudang diperbarui' }
  } catch (error) {
    console.error('Update warehouse error:', error)
    const err = error as Error
    if (err.message.includes('Unauthorized')) {
      return { error: 'Anda tidak memiliki izin untuk mengedit gudang ini.' }
    }
    return { error: 'Gagal memperbarui gudang' }
  }
}

export async function deleteWarehouse(id: string) {
  const session = await requireAuth({
    roles: ['super_admin', 'faculty_admin'],
  })

  try {
    await db.transaction(async (tx) => {
      const [oldData] = await tx.select().from(warehouses).where(eq(warehouses.id, id)).limit(1)

      if (!oldData) throw new Error('Warehouse not found')

      if (session.user.role === 'faculty_admin' && oldData.facultyId !== session.user.facultyId) {
        throw new Error('Unauthorized')
      }

      await tx.delete(warehouses).where(eq(warehouses.id, id))

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'DELETE',
        tableName: 'warehouses',
        recordId: id,
        oldValues: oldData,
      })
    })

    revalidatePath('/dashboard/warehouses')
    return { success: true, message: 'Gudang dihapus' }
  } catch (error) {
    const dbError = error as { code?: string; message?: string }

    if (dbError.message?.includes('Unauthorized')) {
      return { error: 'Anda tidak memiliki izin untuk menghapus gudang ini.' }
    }

    if (dbError.code === '23503') {
      return {
        error: 'Gagal hapus: Gudang masih menyimpan stok barang atau aset.',
      }
    }
    return { error: 'Gagal menghapus gudang' }
  }
}
