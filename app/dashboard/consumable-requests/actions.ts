'use server'

import { revalidatePath } from 'next/cache'

import { randomUUID } from 'crypto'
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { z } from 'zod'

import { auditLogs, requestItems, requests, rooms, user, warehouseStocks } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

const itemSchema = z.object({
  consumableId: z.string().min(1, 'Pilih barang'),
  quantity: z.coerce.number().min(1, 'Minimal 1'),
})

const requestSchema = z.object({
  targetWarehouseId: z.string().min(1, 'Pilih gudang tujuan'),
  roomId: z.string().min(1, 'Pilih ruangan tujuan'),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Minimal satu barang harus dipilih'),
})

function generateRequestCode() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.random().toString(36).substring(2, 7).toUpperCase()
  return `REQ/${date}/${random}`
}

export async function createRequest(data: z.infer<typeof requestSchema>) {
  const session = await requireAuth({ roles: ['unit_staff', 'unit_admin'] })

  if (!session.user.unitId) {
    return { error: 'Akun Anda tidak terhubung dengan Unit Kerja.' }
  }

  const parsed = requestSchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid.' }

  const { targetWarehouseId, roomId, notes, items } = parsed.data

  const initialStatus = session.user.role === 'unit_admin' ? 'PENDING_FACULTY' : 'PENDING_UNIT'

  try {
    await db.transaction(async (tx) => {
      const [selectedRoom] = await tx
        .select()
        .from(rooms)
        .where(and(eq(rooms.id, roomId), eq(rooms.unitId, session.user.unitId!)))
        .limit(1)

      if (!selectedRoom) {
        throw new Error('Ruangan tidak valid atau bukan milik unit Anda.')
      }

      const requestId = randomUUID()
      const code = generateRequestCode()

      for (const item of items) {
        const [stock] = await tx
          .select()
          .from(warehouseStocks)
          .where(
            and(
              eq(warehouseStocks.warehouseId, targetWarehouseId),
              eq(warehouseStocks.consumableId, item.consumableId),
            ),
          )
          .limit(1)

        if (!stock) {
          throw new Error(`Barang (ID: ${item.consumableId}) tidak ditemukan di gudang ini.`)
        }

        if (Number(stock.quantity) < item.quantity) {
          throw new Error(
            `Stok tidak mencukupi untuk salah satu barang. Sisa stok: ${Number(stock.quantity)}`,
          )
        }
      }

      await tx.insert(requests).values({
        id: requestId,
        requestCode: code,
        requesterId: session.user.id,
        roomId: selectedRoom.id,
        targetWarehouseId: targetWarehouseId,
        status: initialStatus,
      })

      for (const item of items) {
        await tx.insert(requestItems).values({
          id: randomUUID(),
          requestId: requestId,
          consumableId: item.consumableId,
          qtyRequested: item.quantity.toString(),
        })
      }

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'CREATE',
        tableName: 'requests',
        recordId: requestId,
        newValues: { code, items, notes, initialStatus, roomId: selectedRoom.id },
      })
    })

    revalidatePath('/dashboard/consumable-requests')
    return { success: true, message: 'Permintaan berhasil dikirim.' }
  } catch (error) {
    console.error('Create Request Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Gagal membuat permintaan.'
    return { error: errorMessage }
  }
}

export async function cancelRequest(requestId: string) {
  const session = await requireAuth({ roles: ['unit_staff', 'unit_admin'] })

  try {
    const [existing] = await db.select().from(requests).where(eq(requests.id, requestId)).limit(1)

    if (!existing) return { error: 'Permintaan tidak ditemukan.' }

    const isOwner = existing.requesterId === session.user.id
    const isAdmin = session.user.role === 'unit_admin'

    if (!isOwner && !isAdmin) {
      return { error: 'Anda tidak memiliki izin membatalkan permintaan ini.' }
    }

    if (existing.status !== 'PENDING_UNIT') {
      return { error: 'Permintaan sudah diproses, tidak bisa dibatalkan.' }
    }

    await db.delete(requests).where(eq(requests.id, requestId))
    revalidatePath('/dashboard/consumable-requests')

    return { success: true, message: 'Permintaan berhasil dibatalkan.' }
  } catch {
    return { error: 'Gagal membatalkan permintaan.' }
  }
}

export async function getConsumableRequests(page: number = 1, limit: number = 10, query?: string) {
  const session = await requireAuth({ roles: ['unit_staff', 'unit_admin'] })
  const { role, id: userId, unitId } = session.user
  const offset = (page - 1) * limit

  let searchCondition = query ? ilike(requests.requestCode, `%${query}%`) : undefined

  if (role === 'unit_admin' && query) {
    searchCondition = or(ilike(requests.requestCode, `%${query}%`), ilike(user.name, `%${query}%`))
  }

  const baseQuery = db
    .select({
      id: requests.id,
      requestCode: requests.requestCode,
      status: requests.status,
      createdAt: requests.createdAt,
      itemCount: sql<number>`count(${requestItems.id})`,
      requesterName: user.name,
      roomName: rooms.name,
    })
    .from(requests)
    .leftJoin(requestItems, eq(requests.id, requestItems.requestId))
    .innerJoin(user, eq(requests.requesterId, user.id))
    .innerJoin(rooms, eq(requests.roomId, rooms.id))

  let whereCondition

  if (role === 'unit_admin') {
    whereCondition = and(eq(user.unitId, unitId!), searchCondition)
  } else {
    whereCondition = and(eq(requests.requesterId, userId), searchCondition)
  }

  const data = await baseQuery
    .where(whereCondition)
    .groupBy(requests.id, user.name, rooms.name)
    .orderBy(desc(requests.createdAt))
    .limit(limit)
    .offset(offset)

  const countRes = await db
    .select({ count: sql<number>`count(DISTINCT ${requests.id})` })
    .from(requests)
    .innerJoin(user, eq(requests.requesterId, user.id))
    .where(whereCondition)

  return {
    data,
    totalItems: Number(countRes[0]?.count || 0),
    userRole: role,
  }
}
