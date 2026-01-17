'use server'

import { and, asc, eq, ilike, sql } from 'drizzle-orm'

import { categories, consumables, roomConsumables, rooms } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

export async function getRoomStocks(page: number = 1, limit: number = 10, query?: string) {
  const session = await requireAuth({ roles: ['unit_staff'] })

  if (!session.user.unitId) {
    return {
      data: [],
      totalItems: 0,
      error: 'Akun Anda tidak terhubung dengan Unit Kerja manapun.',
    }
  }

  const [userRoom] = await db
    .select()
    .from(rooms)
    .where(eq(rooms.unitId, session.user.unitId))
    .limit(1)

  if (!userRoom) {
    return {
      data: [],
      totalItems: 0,
      error: 'Unit kerja Anda belum memiliki konfigurasi ruangan.',
    }
  }

  const offset = (page - 1) * limit

  const searchCondition = query ? ilike(consumables.name, `%${query}%`) : undefined

  const whereCondition = and(eq(roomConsumables.roomId, userRoom.id), searchCondition)

  const data = await db
    .select({
      id: roomConsumables.id,
      quantity: roomConsumables.quantity,
      updatedAt: roomConsumables.updatedAt,
      consumable: {
        name: consumables.name,
        sku: consumables.sku,
        unit: consumables.baseUnit,
      },
      category: {
        name: categories.name,
      },
    })
    .from(roomConsumables)
    .innerJoin(consumables, eq(roomConsumables.consumableId, consumables.id))
    .leftJoin(categories, eq(consumables.categoryId, categories.id))
    .where(whereCondition)
    .orderBy(asc(consumables.name))
    .limit(limit)
    .offset(offset)

  const countRes = await db
    .select({ count: sql<number>`count(*)` })
    .from(roomConsumables)
    .innerJoin(consumables, eq(roomConsumables.consumableId, consumables.id))
    .where(whereCondition)

  return {
    data,
    totalItems: Number(countRes[0]?.count || 0),
    roomName: userRoom.name,
  }
}
