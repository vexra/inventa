'use server'

import { SQL, and, asc, desc, eq, ilike, lte, or, sql } from 'drizzle-orm'

import { categories, consumables, roomConsumables, rooms, units } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

type BatchQueryResult = {
  id: string
  batch: string | null
  qty: number
  exp: string | null
  roomName: string
}

function getDaysDifference(dateString: string) {
  const targetDate = new Date(dateString)
  const today = new Date()

  targetDate.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)

  const diffTime = targetDate.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export async function getAllUnits() {
  const session = await requireAuth({ roles: ['faculty_admin'] })

  if (!session.user.facultyId) {
    return []
  }

  try {
    const data = await db
      .select({
        id: units.id,
        name: units.name,
      })
      .from(units)
      .where(eq(units.facultyId, session.user.facultyId))
      .orderBy(asc(units.name))

    return data
  } catch (error) {
    console.error('Error fetching units:', error)
    return []
  }
}

export async function getRoomStocks(
  page: number = 1,
  limit: number = 10,
  query: string = '',
  statusFilter: string = '',
  targetUnitId?: string,
  sortCol: string = 'name',
  sortOrder: 'asc' | 'desc' = 'asc',
  targetRoomId?: string,
) {
  const session = await requireAuth({
    roles: ['unit_staff', 'unit_admin', 'faculty_admin'],
  })

  let finalUnitId = targetUnitId

  if (session.user.role === 'faculty_admin') {
    if (!finalUnitId) {
      return { error: 'Unit belum dipilih.' }
    }
  } else {
    if (!session.user.unitId) {
      return { error: 'Akun Anda tidak terhubung dengan Unit manapun.' }
    }
    finalUnitId = session.user.unitId
  }

  try {
    const offset = (page - 1) * limit

    const baseConditions = [
      eq(rooms.unitId, finalUnitId),

      targetRoomId ? eq(rooms.id, targetRoomId) : undefined,

      query
        ? or(ilike(consumables.name, `%${query}%`), ilike(consumables.sku, `%${query}%`))
        : undefined,
    ].filter(Boolean) as SQL[]

    const stocksQuery = db
      .select({
        id: consumables.id,
        name: consumables.name,
        sku: consumables.sku,
        category: categories.name,
        unit: consumables.baseUnit,
        minimumStock: consumables.minimumStock,

        totalQty: sql<number>`CAST(SUM(${roomConsumables.quantity}) AS DECIMAL)`,

        batches: sql<BatchQueryResult[]>`json_agg(
          json_build_object(
            'id', ${roomConsumables.id},
            'batch', ${roomConsumables.batchNumber},
            'qty', ${roomConsumables.quantity},
            'exp', ${roomConsumables.expiryDate},
            'roomName', ${rooms.name}
          ) ORDER BY ${roomConsumables.expiryDate} ASC NULLS FIRST
        )`.as('batches'),
      })
      .from(roomConsumables)
      .innerJoin(consumables, eq(roomConsumables.consumableId, consumables.id))
      .innerJoin(rooms, eq(roomConsumables.roomId, rooms.id))
      .leftJoin(categories, eq(consumables.categoryId, categories.id))
      .where(and(...baseConditions))
      .groupBy(
        consumables.id,
        consumables.name,
        consumables.sku,
        categories.name,
        consumables.baseUnit,
        consumables.minimumStock,
      )

    let havingClause: SQL | undefined

    if (statusFilter === 'out') {
      havingClause = lte(sql`SUM(${roomConsumables.quantity})`, 0)
    } else if (statusFilter === 'low') {
      havingClause = and(
        sql`SUM(${roomConsumables.quantity}) > 0`,
        lte(sql`SUM(${roomConsumables.quantity})`, consumables.minimumStock),
      )
    }

    const queryWithHaving = havingClause ? stocksQuery.having(havingClause) : stocksQuery

    const sortImplementation = sortOrder === 'asc' ? asc : desc
    const orderByCol =
      sortCol === 'totalQty' ? sql`SUM(${roomConsumables.quantity})` : consumables.name

    const rows = await queryWithHaving
      .orderBy(sortImplementation(orderByCol))
      .limit(limit)
      .offset(offset)

    let totalItems = 0

    if (statusFilter) {
      const allMatchingRows = await queryWithHaving
      totalItems = allMatchingRows.length
    } else {
      const countQuery = db
        .select({
          count: sql<number>`count(distinct ${consumables.id})`,
        })
        .from(roomConsumables)
        .innerJoin(consumables, eq(roomConsumables.consumableId, consumables.id))
        .innerJoin(rooms, eq(roomConsumables.roomId, rooms.id))
        .where(and(...baseConditions))

      const countRes = await countQuery
      totalItems = Number(countRes[0]?.count || 0)
    }

    const totalPages = Math.ceil(totalItems / limit)

    const formattedData = rows.map((row) => {
      const batches = row.batches || []
      let hasExpired = false
      let hasNearExpiry = false

      const activeBatches = batches.filter((b) => Number(b.qty) > 0)

      activeBatches.forEach((b) => {
        if (b.exp) {
          const diffDays = getDaysDifference(b.exp)
          if (diffDays < 0) hasExpired = true
          else if (diffDays <= 90) hasNearExpiry = true
        }
      })

      const totalQty = Number(row.totalQty)
      const minStock = row.minimumStock ?? 0

      let status: 'OUT' | 'LOW' | 'SAFE' = 'SAFE'
      if (totalQty <= 0) status = 'OUT'
      else if (minStock > 0 && totalQty <= minStock) status = 'LOW'

      return {
        id: row.id,
        name: row.name,
        sku: row.sku,
        category: row.category,
        totalQuantity: totalQty,
        unit: row.unit,
        minimumStock: minStock,
        status,
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
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    }
  } catch (error) {
    console.error('Error fetching room stocks:', error)
    return { error: 'Gagal memuat data stok ruangan.' }
  }
}
