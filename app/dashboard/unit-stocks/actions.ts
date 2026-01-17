'use server'

import { and, asc, eq, ilike, sql } from 'drizzle-orm'

import { categories, consumables, roomConsumables, rooms } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

export async function getUnitStocks(
  page: number = 1,
  limit: number = 10,
  query?: string,
  roomId?: string,
) {
  const session = await requireAuth({ roles: ['unit_admin'] })

  if (!session.user.unitId) {
    return { data: [], totalItems: 0, error: 'Akun tidak terhubung ke Unit.' }
  }

  const offset = (page - 1) * limit

  const searchCondition = query ? ilike(consumables.name, `%${query}%`) : undefined

  const roomCondition = roomId
    ? and(eq(rooms.id, roomId), eq(rooms.unitId, session.user.unitId))
    : eq(rooms.unitId, session.user.unitId)

  const whereCondition = and(roomCondition, eq(roomConsumables.roomId, rooms.id), searchCondition)

  const data = await db
    .select({
      id: roomConsumables.id,
      quantity: roomConsumables.quantity,
      updatedAt: roomConsumables.updatedAt,
      roomName: rooms.name,
      consumable: {
        name: consumables.name,
        sku: consumables.sku,
        unit: consumables.baseUnit,
        minimumStock: consumables.minimumStock,
      },
      category: {
        name: categories.name,
      },
    })
    .from(roomConsumables)
    .innerJoin(rooms, eq(roomConsumables.roomId, rooms.id))
    .innerJoin(consumables, eq(roomConsumables.consumableId, consumables.id))
    .leftJoin(categories, eq(consumables.categoryId, categories.id))
    .where(whereCondition)
    .orderBy(asc(rooms.name), asc(consumables.name))
    .limit(limit)
    .offset(offset)

  const countRes = await db
    .select({ count: sql<number>`count(*)` })
    .from(roomConsumables)
    .innerJoin(rooms, eq(roomConsumables.roomId, rooms.id))
    .innerJoin(consumables, eq(roomConsumables.consumableId, consumables.id))
    .where(whereCondition)

  return {
    data,
    totalItems: Number(countRes[0]?.count || 0),
  }
}

export async function getUnitRooms() {
  const session = await requireAuth({ roles: ['unit_admin'] })

  if (!session.user.unitId) return []

  const data = await db
    .select({
      id: rooms.id,
      name: rooms.name,
    })
    .from(rooms)
    .where(eq(rooms.unitId, session.user.unitId))
    .orderBy(asc(rooms.name))

  return data
}
