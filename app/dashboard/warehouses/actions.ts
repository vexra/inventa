'use server'

import { revalidatePath } from 'next/cache'

import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'

import { warehouses } from '@/db/schema'
import { db } from '@/lib/db'
import { warehouseSchema } from '@/lib/validations/warehouse'

export async function createWarehouse(data: unknown) {
  const parsed = warehouseSchema.safeParse(data)
  if (!parsed.success) return { error: 'Invalid data' }

  try {
    await db.insert(warehouses).values({
      id: randomUUID(),
      name: parsed.data.name,
      location: parsed.data.location || null,
    })
    revalidatePath('/dashboard/warehouses')
    return { success: true, message: 'Gudang berhasil ditambahkan' }
  } catch (error) {
    return { error: 'Gagal menambahkan gudang' }
  }
}

export async function updateWarehouse(id: string, data: unknown) {
  const parsed = warehouseSchema.safeParse(data)
  if (!parsed.success) return { error: 'Invalid data' }

  try {
    await db
      .update(warehouses)
      .set({
        name: parsed.data.name,
        location: parsed.data.location || null,
      })
      .where(eq(warehouses.id, id))

    revalidatePath('/dashboard/warehouses')
    return { success: true, message: 'Data gudang diperbarui' }
  } catch (error) {
    return { error: 'Gagal memperbarui gudang' }
  }
}

export async function deleteWarehouse(id: string) {
  try {
    await db.delete(warehouses).where(eq(warehouses.id, id))
    revalidatePath('/dashboard/warehouses')
    return { success: true, message: 'Gudang dihapus' }
  } catch (error) {
    return { error: 'Gagal menghapus gudang (mungkin sedang digunakan)' }
  }
}
