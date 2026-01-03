'use server'

import { revalidatePath } from 'next/cache'

import { randomUUID } from 'crypto'
import { eq, sql } from 'drizzle-orm'

import {
  items,
  procurementDetails,
  requestDetails,
  stockAdjustments,
  unitStocks,
  usageDetails,
  warehouseStocks,
} from '@/db/schema'
import { db } from '@/lib/db'
import { itemSchema } from '@/lib/validations/item'

export async function createItem(data: unknown) {
  const parsed = itemSchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid' }

  try {
    await db.insert(items).values({
      id: randomUUID(),
      ...parsed.data,
      sku: parsed.data.sku || null,
      description: parsed.data.description || null,
    })
    revalidatePath('/dashboard/items')
    return { success: true, message: 'Barang berhasil ditambahkan' }
  } catch {
    return { error: 'Gagal menambahkan barang. SKU mungkin duplikat.' }
  }
}

export async function updateItem(id: string, data: unknown) {
  const parsed = itemSchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid' }

  try {
    await db
      .update(items)
      .set({
        ...parsed.data,
        sku: parsed.data.sku || null,
        description: parsed.data.description || null,
      })
      .where(eq(items.id, id))

    revalidatePath('/dashboard/items')
    return { success: true, message: 'Data barang diperbarui' }
  } catch {
    return { error: 'Gagal memperbarui barang' }
  }
}

export async function deleteItem(id: string) {
  try {
    const checks = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(warehouseStocks)
        .where(eq(warehouseStocks.itemId, id)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(unitStocks)
        .where(eq(unitStocks.itemId, id)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(requestDetails)
        .where(eq(requestDetails.itemId, id)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(procurementDetails)
        .where(eq(procurementDetails.itemId, id)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(stockAdjustments)
        .where(eq(stockAdjustments.itemId, id)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(usageDetails)
        .where(eq(usageDetails.itemId, id)),
    ])

    const totalUsage = checks.reduce((acc, curr) => acc + Number(curr[0].count), 0)

    if (totalUsage > 0) {
      await db.update(items).set({ deletedAt: new Date(), isActive: false }).where(eq(items.id, id))

      revalidatePath('/dashboard/items')
      return {
        success: true,
        message: 'Barang diarsipkan (Soft Delete) karena memiliki riwayat transaksi.',
      }
    } else {
      await db.delete(items).where(eq(items.id, id))

      revalidatePath('/dashboard/items')
      return { success: true, message: 'Barang dihapus permanen.' }
    }
  } catch (error) {
    console.error(error)
    return { error: 'Gagal menghapus barang' }
  }
}
