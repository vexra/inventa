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
    roles: ['super_admin'],
  })

  const parsed = warehouseSchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid' }

  const newId = randomUUID()

  try {
    await db.transaction(async (tx) => {
      await tx.insert(warehouses).values({
        id: newId,
        name: parsed.data.name,
        type: parsed.data.type,
        facultyId: parsed.data.facultyId || null,
        description: parsed.data.description || null,
      })

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'CREATE',
        tableName: 'warehouses',
        recordId: newId,
        newValues: parsed.data,
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
    roles: ['super_admin'],
  })

  const parsed = warehouseSchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid' }

  try {
    await db.transaction(async (tx) => {
      const [oldData] = await tx.select().from(warehouses).where(eq(warehouses.id, id)).limit(1)

      if (!oldData) throw new Error('Warehouse not found')

      await tx
        .update(warehouses)
        .set({
          name: parsed.data.name,
          type: parsed.data.type,
          facultyId: parsed.data.facultyId || null,
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
        newValues: parsed.data,
      })
    })

    revalidatePath('/dashboard/warehouses')
    return { success: true, message: 'Data gudang diperbarui' }
  } catch (error) {
    console.error('Update warehouse error:', error)
    return { error: 'Gagal memperbarui gudang' }
  }
}

export async function deleteWarehouse(id: string) {
  const session = await requireAuth({
    roles: ['super_admin'],
  })

  try {
    await db.transaction(async (tx) => {
      const [oldData] = await tx.select().from(warehouses).where(eq(warehouses.id, id)).limit(1)

      if (!oldData) throw new Error('Warehouse not found')

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
    const dbError = error as { code?: string }

    // Handle FK error (jika gudang masih punya stok)
    if (dbError.code === '23503') {
      return {
        error: 'Gagal hapus: Gudang masih menyimpan stok barang atau aset.',
      }
    }
    return { error: 'Gagal menghapus gudang' }
  }
}
