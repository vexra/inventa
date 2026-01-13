'use server'

import { revalidatePath } from 'next/cache'

import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'

import { auditLogs, consumables } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { consumableSchema } from '@/lib/validations/consumable'

export async function createConsumable(data: unknown) {
  const session = await requireAuth({
    roles: ['super_admin', 'warehouse_staff'],
  })

  const parsed = consumableSchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid' }

  const newId = randomUUID()

  try {
    await db.transaction(async (tx) => {
      if (parsed.data.sku) {
        const existingSku = await tx
          .select()
          .from(consumables)
          .where(eq(consumables.sku, parsed.data.sku))
          .limit(1)

        if (existingSku.length > 0) {
          throw new Error('DUPLICATE_SKU')
        }
      }

      await tx.insert(consumables).values({
        id: newId,
        name: parsed.data.name,
        sku: parsed.data.sku,
        categoryId: parsed.data.categoryId,
        baseUnit: parsed.data.baseUnit,
        minimumStock: parsed.data.minimumStock,
        hasExpiry: parsed.data.hasExpiry,
        description: parsed.data.description || null,
        isActive: true,
      })

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'CREATE',
        tableName: 'consumables',
        recordId: newId,
        newValues: parsed.data,
      })
    })

    revalidatePath('/dashboard/consumables')
    return { success: true, message: 'Barang berhasil ditambahkan' }
  } catch (error) {
    const err = error as { message?: string }

    if (err.message === 'DUPLICATE_SKU') {
      return { error: 'Gagal: SKU sudah digunakan.' }
    }
    console.error('Create consumable error:', error)
    return { error: 'Gagal menambahkan barang' }
  }
}

export async function updateConsumable(id: string, data: unknown) {
  const session = await requireAuth({
    roles: ['super_admin', 'warehouse_staff'],
  })

  const parsed = consumableSchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid' }

  try {
    await db.transaction(async (tx) => {
      const [oldData] = await tx.select().from(consumables).where(eq(consumables.id, id)).limit(1)

      if (!oldData) throw new Error('Consumable not found')

      if (parsed.data.sku && oldData.sku !== parsed.data.sku) {
        const existingSku = await tx
          .select()
          .from(consumables)
          .where(eq(consumables.sku, parsed.data.sku))
          .limit(1)
        if (existingSku.length > 0) throw new Error('DUPLICATE_SKU')
      }

      await tx
        .update(consumables)
        .set({
          name: parsed.data.name,
          sku: parsed.data.sku,
          categoryId: parsed.data.categoryId,
          baseUnit: parsed.data.baseUnit,
          minimumStock: parsed.data.minimumStock,
          hasExpiry: parsed.data.hasExpiry,
          description: parsed.data.description || null,
        })
        .where(eq(consumables.id, id))

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'UPDATE',
        tableName: 'consumables',
        recordId: id,
        oldValues: oldData,
        newValues: parsed.data,
      })
    })

    revalidatePath('/dashboard/consumables')
    return { success: true, message: 'Data barang diperbarui' }
  } catch (error) {
    const err = error as { message?: string }

    if (err.message === 'DUPLICATE_SKU') {
      return { error: 'Gagal: SKU sudah digunakan.' }
    }
    console.error('Update consumable error:', error)
    return { error: 'Gagal memperbarui barang' }
  }
}

export async function deleteConsumable(id: string) {
  const session = await requireAuth({
    roles: ['super_admin', 'warehouse_staff'],
  })

  try {
    await db.transaction(async (tx) => {
      const [oldData] = await tx.select().from(consumables).where(eq(consumables.id, id)).limit(1)

      if (!oldData) throw new Error('Consumable not found')

      await tx.delete(consumables).where(eq(consumables.id, id))

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'DELETE',
        tableName: 'consumables',
        recordId: id,
        oldValues: oldData,
      })
    })

    revalidatePath('/dashboard/consumables')
    return { success: true, message: 'Barang dihapus' }
  } catch (error) {
    const err = error as { code?: string }

    if (err.code === '23503') {
      return {
        error: 'Gagal: Barang ini masih digunakan dalam data stok.',
      }
    }
    return { error: 'Gagal menghapus barang' }
  }
}
