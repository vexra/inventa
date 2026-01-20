'use server'

import { and, asc, eq, ilike, lte, or, sql } from 'drizzle-orm'

import { categories, consumables, warehouseStocks } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

type BatchItem = {
  id: string
  batch: string
  qty: number
  exp: string | null
}

export async function getWarehouseStocks(
  page: number = 1,
  limit: number = 10,
  query: string = '',
  statusFilter: 'all' | 'low' | 'out' = 'all',
) {
  const session = await requireAuth({ roles: ['warehouse_staff'] })

  if (!session.user.warehouseId) {
    return { error: 'Anda tidak terdaftar di gudang manapun.' }
  }

  const offset = (page - 1) * limit

  let searchCondition = undefined
  if (query) {
    searchCondition = or(
      ilike(consumables.name, `%${query}%`),
      ilike(consumables.sku, `%${query}%`),
    )
  }

  try {
    const sq = db
      .select({
        warehouseId: warehouseStocks.warehouseId,
        consumableId: warehouseStocks.consumableId,
        totalQty: sql<number>`sum(${warehouseStocks.quantity})`.as('total_qty'),
      })
      .from(warehouseStocks)
      .where(eq(warehouseStocks.warehouseId, session.user.warehouseId))
      .groupBy(warehouseStocks.warehouseId, warehouseStocks.consumableId)
      .as('sq')

    let mainQuery = db
      .select({
        id: consumables.id,
        name: consumables.name,
        sku: consumables.sku,
        category: categories.name,
        unit: consumables.baseUnit,
        minimumStock: consumables.minimumStock,
        totalQty: sq.totalQty,
        batches: sql<BatchItem[]>`json_agg(
            json_build_object(
              'id', ${warehouseStocks.id},
              'batch', ${warehouseStocks.batchNumber},
              'qty', ${warehouseStocks.quantity},
              'exp', ${warehouseStocks.expiryDate}
            ) ORDER BY ${warehouseStocks.expiryDate} ASC
          )`.as('batches'),
      })
      .from(sq)
      .innerJoin(consumables, eq(sq.consumableId, consumables.id))
      .leftJoin(categories, eq(consumables.categoryId, categories.id))
      .innerJoin(
        warehouseStocks,
        and(
          eq(warehouseStocks.consumableId, consumables.id),
          eq(warehouseStocks.warehouseId, session.user.warehouseId),
        ),
      )
      .groupBy(
        consumables.id,
        consumables.name,
        consumables.sku,
        categories.name,
        consumables.baseUnit,
        consumables.minimumStock,
        sq.totalQty,
      )
      .$dynamic()

    if (searchCondition) {
      mainQuery = mainQuery.where(searchCondition)
    }

    if (statusFilter === 'out') {
      mainQuery = mainQuery.having(lte(sq.totalQty, 0))
    } else if (statusFilter === 'low') {
      mainQuery = mainQuery.having(
        and(sql`${sq.totalQty} > 0`, sql`${sq.totalQty} <= ${consumables.minimumStock}`),
      )
    }

    const rows = await mainQuery.limit(limit).offset(offset).orderBy(asc(consumables.name))

    const countQuery = db
      .select({
        consumableId: warehouseStocks.consumableId,
        totalQty: sql<number>`sum(${warehouseStocks.quantity})`.as('total_qty'),
      })
      .from(warehouseStocks)
      .innerJoin(consumables, eq(warehouseStocks.consumableId, consumables.id))
      .where(and(eq(warehouseStocks.warehouseId, session.user.warehouseId), searchCondition))
      .groupBy(warehouseStocks.consumableId, consumables.minimumStock)

    if (statusFilter === 'out') {
      countQuery.having(lte(sql`sum(${warehouseStocks.quantity})`, 0))
    } else if (statusFilter === 'low') {
      countQuery.having(
        and(
          sql`sum(${warehouseStocks.quantity}) > 0`,
          sql`sum(${warehouseStocks.quantity}) <= ${consumables.minimumStock}`,
        ),
      )
    }

    const allMatchingRows = await countQuery
    const totalItems = allMatchingRows.length
    const totalPages = Math.ceil(totalItems / limit)

    const formattedData = rows.map((row) => {
      const now = new Date()
      const batches = row.batches || []

      let hasExpired = false
      let hasNearExpiry = false

      const activeBatches = batches.filter((b) => Number(b.qty) > 0)

      activeBatches.forEach((b) => {
        if (b.exp) {
          const expDate = new Date(b.exp)
          const diffTime = expDate.getTime() - now.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

          if (diffDays <= 0) hasExpired = true
          else if (diffDays <= 30) hasNearExpiry = true
        }
      })

      return {
        id: row.id,
        name: row.name,
        sku: row.sku,
        category: row.category,
        totalQuantity: Number(row.totalQty),
        unit: row.unit,
        minimumStock: row.minimumStock,
        status: (Number(row.totalQty) <= 0
          ? 'OUT'
          : row.minimumStock !== null && Number(row.totalQty) <= row.minimumStock
            ? 'LOW'
            : 'SAFE') as 'OUT' | 'LOW' | 'SAFE',
        hasExpired,
        hasNearExpiry,
        batches: activeBatches,
      }
    })

    return {
      data: formattedData,
      metadata: {
        totalItems,
        totalPages,
        currentPage: page,
      },
    }
  } catch (error) {
    console.error('Error fetching aggregated stocks:', error)
    return { error: 'Gagal mengambil data stok' }
  }
}
