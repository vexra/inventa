'use server'

import { revalidatePath } from 'next/cache'

import { randomUUID } from 'crypto'
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { z } from 'zod'

import { auditLogs, requestItems, requests, rooms } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

const itemSchema = z.object({
  consumableId: z.string().min(1, 'Pilih barang'),
  quantity: z.coerce.number().min(1, 'Minimal 1'),
})

const requestSchema = z.object({
  targetWarehouseId: z.string().min(1, 'Pilih gudang tujuan'),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Minimal satu barang harus dipilih'),
})

function generateRequestCode() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.random().toString(36).substring(2, 7).toUpperCase()
  return `REQ/${date}/${random}`
}

export async function createRequest(data: z.infer<typeof requestSchema>) {
  const session = await requireAuth({ roles: ['unit_staff'] })

  if (!session.user.unitId) {
    return { error: 'Akun Anda tidak terhubung dengan Unit Kerja manapun.' }
  }

  const parsed = requestSchema.safeParse(data)
  if (!parsed.success) {
    return { error: 'Data tidak valid.' }
  }

  const { items, notes, targetWarehouseId } = parsed.data

  try {
    await db.transaction(async (tx) => {
      const requestId = randomUUID()

      const [defaultRoom] = await tx
        .select()
        .from(rooms)
        .where(eq(rooms.unitId, session.user.unitId!))
        .limit(1)

      if (!defaultRoom) {
        throw new Error('Unit kerja Anda belum memiliki Ruangan terdaftar. Hubungi Admin.')
      }

      await tx.insert(requests).values({
        id: requestId,
        requestCode: generateRequestCode(),
        requesterId: session.user.id,
        roomId: defaultRoom.id,
        targetWarehouseId: targetWarehouseId,
        status: 'PENDING_UNIT',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      for (const item of items) {
        await tx.insert(requestItems).values({
          id: randomUUID(),
          requestId: requestId,
          consumableId: item.consumableId,
          qtyRequested: item.quantity.toString(),
          qtyApproved: null,
        })
      }

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'CREATE',
        tableName: 'requests',
        recordId: requestId,
        newValues: {
          targetWarehouseId,
          items,
          userNotes: notes,
          generatedCode: requestId,
        },
      })
    })

    revalidatePath('/dashboard/my-requests')
    return { success: true, message: 'Permintaan berhasil dibuat.' }
  } catch (error) {
    console.error('Create Request Error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Gagal membuat permintaan.'

    return { error: errorMessage }
  }
}

export async function cancelRequest(requestId: string) {
  const session = await requireAuth({ roles: ['unit_staff'] })
  try {
    const [existing] = await db
      .select()
      .from(requests)
      .where(and(eq(requests.id, requestId), eq(requests.requesterId, session.user.id)))
      .limit(1)

    if (!existing) return { error: 'Permintaan tidak ditemukan.' }
    if (existing.status !== 'PENDING_UNIT') {
      return { error: 'Permintaan sudah diproses, tidak bisa dibatalkan.' }
    }
    await db.delete(requests).where(eq(requests.id, requestId))
    revalidatePath('/dashboard/my-requests')
    return { success: true, message: 'Permintaan berhasil dibatalkan.' }
  } catch {
    return { error: 'Gagal membatalkan permintaan.' }
  }
}

export async function getMyRequests(page: number = 1, limit: number = 10, query?: string) {
  const session = await requireAuth({ roles: ['unit_staff'] })
  const offset = (page - 1) * limit
  const searchCondition = query ? or(ilike(requests.requestCode, `%${query}%`)) : undefined
  const whereCondition = and(eq(requests.requesterId, session.user.id), searchCondition)

  const data = await db
    .select({
      id: requests.id,
      requestCode: requests.requestCode,
      status: requests.status,
      createdAt: requests.createdAt,
      itemCount: sql<number>`count(${requestItems.id})`,
    })
    .from(requests)
    .leftJoin(requestItems, eq(requests.id, requestItems.requestId))
    .where(whereCondition)
    .groupBy(requests.id)
    .orderBy(desc(requests.createdAt))
    .limit(limit)
    .offset(offset)

  const countRes = await db
    .select({ count: sql<number>`count(*)` })
    .from(requests)
    .where(whereCondition)

  return {
    data,
    totalItems: Number(countRes[0]?.count || 0),
  }
}
