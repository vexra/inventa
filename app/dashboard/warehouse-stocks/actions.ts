'use server'

import { and, asc, eq, ilike, lte, or, sql } from 'drizzle-orm'

import { categories, consumables, warehouseStocks } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

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
  let baseCondition = eq(warehouseStocks.warehouseId, session.user.warehouseId)

  if (query) {
    baseCondition = and(
      baseCondition,
      or(ilike(consumables.name, `%${query}%`), ilike(consumables.sku, `%${query}%`)),
    )!
  }

  if (statusFilter === 'out') {
    baseCondition = and(baseCondition, lte(warehouseStocks.quantity, '0'))!
  } else if (statusFilter === 'low') {
    baseCondition = and(
      baseCondition,
      sql`${warehouseStocks.quantity} <= ${consumables.minimumStock}`,
    )!
  }

  try {
    const countRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(warehouseStocks)
      .innerJoin(consumables, eq(warehouseStocks.consumableId, consumables.id))
      .where(baseCondition)

    const totalItems = Number(countRes[0]?.count || 0)
    const totalPages = Math.ceil(totalItems / limit)

    const data = await db
      .select({
        id: warehouseStocks.id,
        consumableId: consumables.id,
        name: consumables.name,
        sku: consumables.sku,
        category: categories.name,
        quantity: sql<number>`${warehouseStocks.quantity}::float`.mapWith(Number),
        unit: consumables.baseUnit,
        minimumStock: consumables.minimumStock,
        updatedAt: warehouseStocks.updatedAt,
      })
      .from(warehouseStocks)
      .innerJoin(consumables, eq(warehouseStocks.consumableId, consumables.id))
      .leftJoin(categories, eq(consumables.categoryId, categories.id))
      .where(baseCondition)
      .limit(limit)
      .offset(offset)
      .orderBy(asc(consumables.name))

    return {
      data,
      metadata: {
        totalItems,
        totalPages,
        currentPage: page,
      },
    }
  } catch (error) {
    console.error('Error fetching stocks:', error)
    return { error: 'Gagal mengambil data stok' }
  }
}
