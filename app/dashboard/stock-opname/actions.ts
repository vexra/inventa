'use server'

import { revalidatePath } from 'next/cache'

import { randomUUID } from 'crypto'
import { SQL, and, asc, count, countDistinct, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { PgColumn } from 'drizzle-orm/pg-core'
import { z } from 'zod'

import {
  auditLogs,
  categories,
  consumableAdjustments,
  consumables,
  user,
  warehouseStocks,
  warehouses,
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

export async function getStockDetail(
  consumableId: string,
  page: number = 1,
  limit: number = 10,
  query: string = '',
) {
  const session = await requireAuth({ roles: ['warehouse_staff'] })

  if (!session.user.warehouseId) {
    return null
  }

  const offset = (page - 1) * limit

  const [consumable] = await db
    .select({
      id: consumables.id,
      name: consumables.name,
      unit: consumables.baseUnit,
      categoryName: categories.name,
    })
    .from(consumables)
    .leftJoin(categories, eq(consumables.categoryId, categories.id))
    .where(eq(consumables.id, consumableId))
    .limit(1)

  if (!consumable) return null

  const [warehouse] = await db
    .select({ name: warehouses.name })
    .from(warehouses)
    .where(eq(warehouses.id, session.user.warehouseId))
    .limit(1)

  const batchesRaw = await db
    .select({
      id: warehouseStocks.id,
      batchNumber: warehouseStocks.batchNumber,
      quantity: warehouseStocks.quantity,
      expiryDate: warehouseStocks.expiryDate,
      createdAt: warehouseStocks.createdAt,
    })
    .from(warehouseStocks)
    .where(
      and(
        eq(warehouseStocks.consumableId, consumableId),
        eq(warehouseStocks.warehouseId, session.user.warehouseId),
      ),
    )
    .orderBy(asc(warehouseStocks.expiryDate))

  const historyConditions: SQL[] = [
    eq(consumableAdjustments.consumableId, consumableId),
    eq(consumableAdjustments.warehouseId, session.user.warehouseId),

    eq(consumableAdjustments.userId, session.user.id),
  ]

  if (query) {
    const searchFilter = or(ilike(consumableAdjustments.reason, `%${query}%`))

    if (searchFilter) {
      historyConditions.push(searchFilter)
    }
  }

  const adjustmentsRaw = await db
    .select({
      id: consumableAdjustments.id,
      deltaQuantity: consumableAdjustments.deltaQuantity,
      type: consumableAdjustments.type,
      reason: consumableAdjustments.reason,
      createdAt: consumableAdjustments.createdAt,
      actorName: user.name,
    })
    .from(consumableAdjustments)
    .leftJoin(user, eq(consumableAdjustments.userId, user.id))
    .where(and(...historyConditions))
    .orderBy(desc(consumableAdjustments.createdAt))
    .limit(limit)
    .offset(offset)

  const [totalResult] = await db
    .select({ count: count() })
    .from(consumableAdjustments)
    .where(and(...historyConditions))

  const totalHistoryItems = totalResult?.count || 0

  const batches = batchesRaw.map((batch) => ({
    ...batch,
    quantity: Number(batch.quantity || 0),
  }))

  const adjustments = adjustmentsRaw.map((adj) => ({
    ...adj,
    deltaQuantity: Number(adj.deltaQuantity || 0),
  }))

  return {
    ...consumable,
    warehouseName: warehouse?.name,
    batches,
    adjustments,
    totalHistoryItems,
  }
}
