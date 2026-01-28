'use server'

import { revalidatePath } from 'next/cache'

import { randomUUID } from 'crypto'
import { SQL, and, asc, countDistinct, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { PgColumn } from 'drizzle-orm/pg-core'
import { z } from 'zod'

import {
  auditLogs,
  categories,
  consumableAdjustments,
  consumables,
  warehouseStocks,
} from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { stockOpnameSchema } from '@/lib/validations/stock-opname'

export async function submitStockOpname(values: z.infer<typeof stockOpnameSchema>) {
  const session = await requireAuth({ roles: ['warehouse_staff'] })

  const validated = stockOpnameSchema.safeParse(values)
  if (!validated.success) return { error: 'Data tidak valid' }

  const { warehouseStockId, physicalQty, reason, consumableId, type } = validated.data

  try {
    const [currentStock] = await db
      .select()
      .from(warehouseStocks)
      .where(eq(warehouseStocks.id, warehouseStockId))
      .limit(1)

    if (!currentStock) return { error: 'Data batch tidak ditemukan' }

    if (session.user.warehouseId && currentStock.warehouseId !== session.user.warehouseId) {
      return { error: 'Akses ditolak ke gudang ini' }
    }

    const systemQty = Number(currentStock.quantity)
    const delta = physicalQty - systemQty

    await db.transaction(async (tx) => {
      await tx.insert(consumableAdjustments).values({
        id: randomUUID(),
        userId: session.user.id,
        consumableId: consumableId,
        warehouseId: currentStock.warehouseId,
        batchNumber: currentStock.batchNumber,
        deltaQuantity: String(delta),
        type: type,
        reason: reason || (delta === 0 ? 'Rutin (Sesuai)' : reason),
      })

      await tx
        .update(warehouseStocks)
        .set({
          quantity: String(physicalQty),
          updatedAt: new Date(),
        })
        .where(eq(warehouseStocks.id, warehouseStockId))

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: type,
        tableName: 'warehouse_stocks',
        recordId: warehouseStockId,
        oldValues: {
          quantity: systemQty,
          batch: currentStock.batchNumber,
          updatedAt: currentStock.updatedAt,
        },
        newValues: { quantity: physicalQty, type, reason, delta, updatedAt: new Date() },
      })
    })

    revalidatePath('/dashboard/stock-opname')

    const message = delta === 0 ? 'Stok terverifikasi (Sesuai)' : 'Stok berhasil diperbarui'

    return { success: true, message }
  } catch (error) {
    console.error('Stock Opname Error:', error)
    return { error: 'Gagal menyimpan perubahan' }
  }
}

export async function getWarehouseStocks(
  page = 1,
  limit = 10,
  query = '',
  sortCol = 'name',
  sortOrder: 'asc' | 'desc' = 'asc',
) {
  const session = await requireAuth({ roles: ['warehouse_staff'] })

  if (!session.user.warehouseId) {
    return { error: 'Warehouse ID not found for user', data: [], totalItems: 0 }
  }

  const offset = (page - 1) * limit

  const warehouseCondition = eq(warehouseStocks.warehouseId, session.user.warehouseId)
  const searchCondition = query
    ? or(
        ilike(consumables.name, `%${query}%`),
        ilike(consumables.sku, `%${query}%`),
        ilike(categories.name, `%${query}%`),
        ilike(warehouseStocks.batchNumber, `%${query}%`),
      )
    : undefined

  const finalCondition = and(warehouseCondition, searchCondition)

  const sortMap: Record<string, PgColumn | SQL> = {
    name: consumables.name,
    category: categories.name,
    total: sql`sum(${warehouseStocks.quantity})`,
    batchCount: sql`count(${warehouseStocks.id})`,
  }

  const orderColumn = sortMap[sortCol] || consumables.name
  const orderBy = sortOrder === 'desc' ? desc(orderColumn) : asc(orderColumn)

  const stocksPromise = db
    .select({
      consumableId: warehouseStocks.consumableId,
      consumableName: consumables.name,
      categoryName: categories.name,
      unit: consumables.baseUnit,
      totalQuantity: sql<number>`sum(${warehouseStocks.quantity})`.mapWith(Number),
      batchCount: sql<number>`count(${warehouseStocks.id})`.mapWith(Number),
      batches: sql<
        {
          id: string
          batchNumber: string | null
          quantity: number
          expiryDate: string | null
        }[]
      >`json_agg(
        json_build_object(
          'id', ${warehouseStocks.id},
          'batchNumber', ${warehouseStocks.batchNumber},
          'quantity', ${warehouseStocks.quantity},
          'expiryDate', ${warehouseStocks.expiryDate}
        ) ORDER BY ${warehouseStocks.expiryDate} ASC
      )`,
    })
    .from(warehouseStocks)
    .innerJoin(consumables, eq(warehouseStocks.consumableId, consumables.id))
    .leftJoin(categories, eq(consumables.categoryId, categories.id))
    .where(finalCondition)
    .groupBy(warehouseStocks.consumableId, consumables.name, categories.name, consumables.baseUnit)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset)

  const countPromise = db
    .select({ count: countDistinct(warehouseStocks.consumableId) })
    .from(warehouseStocks)
    .innerJoin(consumables, eq(warehouseStocks.consumableId, consumables.id))
    .leftJoin(categories, eq(consumables.categoryId, categories.id))
    .where(finalCondition)

  const [stocks, countResult] = await Promise.all([stocksPromise, countPromise])

  const totalItems = countResult[0]?.count || 0

  const formattedStocks = stocks.map((item) => ({
    consumableId: item.consumableId,
    consumableName: item.consumableName,
    categoryName: item.categoryName,
    unit: item.unit,
    totalQuantity: item.totalQuantity,
    batchCount: item.batchCount,
    batches: item.batches.map((b) => ({
      id: b.id,
      batchNumber: b.batchNumber,
      quantity: Number(b.quantity),
      expiryDate: b.expiryDate ? new Date(b.expiryDate) : null,
    })),
  }))

  return {
    data: formattedStocks,
    totalItems,
  }
}
