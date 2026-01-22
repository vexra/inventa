'use server'

import { revalidatePath } from 'next/cache'

import { randomUUID } from 'crypto'
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import { z } from 'zod'

import {
  auditLogs,
  requestItems,
  requestTimelines,
  requests,
  rooms,
  units,
  user,
  warehouseStocks,
} from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

const itemSchema = z.object({
  consumableId: z.string().min(1, 'Pilih barang'),
  quantity: z.coerce.number().min(1, 'Minimal 1'),
})

const requestSchema = z.object({
  targetWarehouseId: z.string().min(1, 'Pilih gudang tujuan'),
  roomId: z.string().min(1, 'Pilih ruangan tujuan'),
  description: z.string().optional(),
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

  const { targetWarehouseId, roomId, description, items } = parsed.data

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

      for (const item of items) {
        const [stockResult] = await tx
          .select({
            totalQuantity: sql<number>`sum(${warehouseStocks.quantity})`.mapWith(Number),
          })
          .from(warehouseStocks)
          .where(
            and(
              eq(warehouseStocks.warehouseId, targetWarehouseId),
              eq(warehouseStocks.consumableId, item.consumableId),
            ),
          )

        const currentTotalStock = stockResult?.totalQuantity ?? 0

        if (currentTotalStock === 0) {
          throw new Error(`Barang (ID: ${item.consumableId}) tidak ditemukan di gudang ini.`)
        }

        if (currentTotalStock < item.quantity) {
          throw new Error(
            `Stok tidak mencukupi untuk salah satu item. Diminta: ${item.quantity}, Tersedia Total: ${currentTotalStock}`,
          )
        }
      }

      const requestId = randomUUID()
      const code = generateRequestCode()

      await tx.insert(requests).values({
        id: requestId,
        requestCode: code,
        requesterId: session.user.id,
        roomId: selectedRoom.id,
        targetWarehouseId: targetWarehouseId,
        status: initialStatus,
        description: description,
      })

      for (const item of items) {
        await tx.insert(requestItems).values({
          id: randomUUID(),
          requestId: requestId,
          consumableId: item.consumableId,
          qtyRequested: item.quantity.toString(),
        })
      }

      await tx.insert(requestTimelines).values({
        id: randomUUID(),
        requestId: requestId,
        status: initialStatus,
        actorId: session.user.id,
        notes: 'Permintaan dibuat baru.',
      })

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'CREATE',
        tableName: 'requests',
        recordId: requestId,
        newValues: { code, items, description, initialStatus, roomId: selectedRoom.id },
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

export async function updateRequest(requestId: string, data: z.infer<typeof requestSchema>) {
  const session = await requireAuth({ roles: ['unit_staff', 'unit_admin'] })

  const parsed = requestSchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid.' }

  const { targetWarehouseId, roomId, description, items } = parsed.data

  try {
    await db.transaction(async (tx) => {
      const [existingRequest] = await tx
        .select()
        .from(requests)
        .where(eq(requests.id, requestId))
        .limit(1)

      if (!existingRequest) {
        throw new Error('Permintaan tidak ditemukan.')
      }

      const isOwner = existingRequest.requesterId === session.user.id
      const isAdmin = session.user.role === 'unit_admin'

      if (!isOwner && !isAdmin) {
        throw new Error('Anda tidak memiliki izin mengedit permintaan ini.')
      }

      const allowedStatuses = ['PENDING_UNIT', 'REJECTED']
      if (!existingRequest.status || !allowedStatuses.includes(existingRequest.status)) {
        throw new Error('Permintaan sudah diproses, tidak bisa diedit.')
      }

      for (const item of items) {
        const [stockResult] = await tx
          .select({
            totalQuantity: sql<number>`sum(${warehouseStocks.quantity})`.mapWith(Number),
          })
          .from(warehouseStocks)
          .where(
            and(
              eq(warehouseStocks.warehouseId, targetWarehouseId),
              eq(warehouseStocks.consumableId, item.consumableId),
            ),
          )

        const currentTotalStock = stockResult?.totalQuantity ?? 0
        if (currentTotalStock === 0 || currentTotalStock < item.quantity) {
          throw new Error(`Stok tidak mencukupi untuk item ID: ${item.consumableId}`)
        }
      }

      await tx
        .update(requests)
        .set({
          roomId: roomId,
          targetWarehouseId: targetWarehouseId,
          description: description,
          status: 'PENDING_UNIT',
          rejectionReason: null,
          approvedByUnitId: null,
          updatedAt: new Date(),
        })
        .where(eq(requests.id, requestId))

      await tx.delete(requestItems).where(eq(requestItems.requestId, requestId))

      for (const item of items) {
        await tx.insert(requestItems).values({
          id: randomUUID(),
          requestId: requestId,
          consumableId: item.consumableId,
          qtyRequested: item.quantity.toString(),
        })
      }

      const isResubmission = existingRequest.status === 'REJECTED'
      const timelineNote = isResubmission
        ? 'Permintaan diperbaiki dan diajukan ulang oleh pemohon.'
        : 'Detail permintaan diperbarui oleh pemohon.'

      await tx.insert(requestTimelines).values({
        id: randomUUID(),
        requestId: requestId,
        status: 'PENDING_UNIT',
        actorId: session.user.id,
        notes: timelineNote,
      })

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'UPDATE',
        tableName: 'requests',
        recordId: requestId,
        newValues: { items, description, roomId, targetWarehouseId, isResubmission },
      })
    })

    revalidatePath('/dashboard/consumable-requests')
    return { success: true, message: 'Permintaan berhasil diperbarui.' }
  } catch (error) {
    console.error('Update Request Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Gagal memperbarui permintaan.'
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

    if (existing.status !== 'PENDING_UNIT' && existing.status !== 'REJECTED') {
      return { error: 'Permintaan sudah diproses atau selesai, tidak bisa dihapus.' }
    }

    await db.transaction(async (tx) => {
      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'DELETE',
        tableName: 'requests',
        recordId: requestId,
        oldValues: existing,
      })

      await tx.delete(requests).where(eq(requests.id, requestId))
    })

    revalidatePath('/dashboard/consumable-requests')

    return { success: true, message: 'Permintaan berhasil dihapus.' }
  } catch (error) {
    console.error('Delete Request Error:', error)
    return { error: 'Gagal menghapus permintaan.' }
  }
}

export async function verifyRequest(
  requestId: string,
  action: 'APPROVE' | 'REJECT',
  reason?: string,
) {
  const session = await requireAuth({ roles: ['unit_admin', 'faculty_admin'] })
  const userRole = session.user.role

  try {
    await db.transaction(async (tx) => {
      const [existingRequest] = await tx
        .select()
        .from(requests)
        .where(eq(requests.id, requestId))
        .limit(1)

      if (!existingRequest) {
        throw new Error('Permintaan tidak ditemukan.')
      }

      let newStatus: typeof requests.$inferSelect.status
      let updateData: Partial<typeof requests.$inferSelect> = {}
      let logMessage = ''

      if (action === 'REJECT') {
        newStatus = 'REJECTED'
        logMessage = `Permintaan ditolak oleh ${userRole === 'unit_admin' ? 'Unit' : 'Fakultas'}. Alasan: ${reason}`
        updateData = { rejectionReason: reason }
      } else {
        if (userRole === 'unit_admin') {
          if (existingRequest.status !== 'PENDING_UNIT') {
            throw new Error('Unit Admin hanya dapat memproses status PENDING_UNIT.')
          }
          newStatus = 'PENDING_FACULTY'
          logMessage = 'Disetujui Unit Admin. Menunggu persetujuan Fakultas.'
          updateData = { approvedByUnitId: session.user.id }
        } else if (userRole === 'faculty_admin') {
          if (existingRequest.status !== 'PENDING_FACULTY') {
            throw new Error('Faculty Admin hanya dapat memproses status PENDING_FACULTY.')
          }
          newStatus = 'APPROVED'
          logMessage = 'Disetujui Fakultas. Masuk antrian gudang.'
          updateData = { approvedByFacultyId: session.user.id }
        } else {
          throw new Error('Role tidak dikenali untuk approval.')
        }
      }

      await tx
        .update(requests)
        .set({
          status: newStatus,
          updatedAt: new Date(),
          ...updateData,
        })
        .where(eq(requests.id, requestId))

      if (newStatus === 'APPROVED') {
        const items = await tx
          .select()
          .from(requestItems)
          .where(eq(requestItems.requestId, requestId))

        for (const item of items) {
          await tx
            .update(requestItems)
            .set({ qtyApproved: item.qtyRequested })
            .where(eq(requestItems.id, item.id))
        }
      }

      await tx.insert(requestTimelines).values({
        id: randomUUID(),
        requestId: requestId,
        status: newStatus,
        actorId: session.user.id,
        notes: logMessage,
      })

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: action,
        tableName: 'requests',
        recordId: requestId,
        newValues: { status: newStatus, ...updateData },
      })
    })

    revalidatePath('/dashboard/consumable-requests')
    return {
      success: true,
      message: action === 'APPROVE' ? 'Permintaan berhasil disetujui.' : 'Permintaan ditolak.',
    }
  } catch (error) {
    console.error('Verify Request Error:', error)
    const msg = error instanceof Error ? error.message : 'Gagal memproses permintaan.'
    return { error: msg }
  }
}

export async function getConsumableRequests(page: number = 1, limit: number = 10, query?: string) {
  const session = await requireAuth({ roles: ['unit_staff', 'unit_admin', 'faculty_admin'] })
  const { role, id: userId, unitId, facultyId } = session.user
  const offset = (page - 1) * limit

  let searchCondition = query ? ilike(requests.requestCode, `%${query}%`) : undefined

  if ((role === 'unit_admin' || role === 'faculty_admin') && query) {
    searchCondition = or(ilike(requests.requestCode, `%${query}%`), ilike(user.name, `%${query}%`))
  }

  let whereCondition
  if (role === 'faculty_admin') {
    whereCondition = and(eq(units.facultyId, facultyId!), searchCondition)
  } else if (role === 'unit_admin') {
    whereCondition = and(eq(user.unitId, unitId!), searchCondition)
  } else {
    whereCondition = and(eq(requests.requesterId, userId), searchCondition)
  }

  const requestsData = await db
    .select({
      id: requests.id,
      requestCode: requests.requestCode,
      status: requests.status,
      createdAt: requests.createdAt,
      description: requests.description,
      rejectionReason: requests.rejectionReason,
      requesterName: user.name,
      roomName: rooms.name,
      targetWarehouseId: requests.targetWarehouseId,
      roomId: requests.roomId,
    })
    .from(requests)
    .innerJoin(user, eq(requests.requesterId, user.id))
    .innerJoin(rooms, eq(requests.roomId, rooms.id))
    .leftJoin(units, eq(user.unitId, units.id))
    .where(whereCondition)
    .orderBy(desc(requests.createdAt))
    .limit(limit)
    .offset(offset)

  const requestIds = requestsData.map((r) => r.id)
  const itemsMap: Record<string, { consumableId: string; quantity: number }[]> = {}
  if (requestIds.length > 0) {
    const itemsData = await db
      .select({
        requestId: requestItems.requestId,
        consumableId: requestItems.consumableId,
        qtyRequested: requestItems.qtyRequested,
      })
      .from(requestItems)
      .where(inArray(requestItems.requestId, requestIds))
    itemsData.forEach((item) => {
      if (!itemsMap[item.requestId!]) itemsMap[item.requestId!] = []
      itemsMap[item.requestId!].push({
        consumableId: item.consumableId,
        quantity: Number(item.qtyRequested),
      })
    })
  }

  const finalData = requestsData.map((req) => ({
    ...req,
    items: itemsMap[req.id] || [],
    itemCount: (itemsMap[req.id] || []).length,
  }))

  const countRes = await db
    .select({ count: sql<number>`count(DISTINCT ${requests.id})` })
    .from(requests)
    .innerJoin(user, eq(requests.requesterId, user.id))
    .leftJoin(units, eq(user.unitId, units.id))
    .where(whereCondition)

  return {
    data: finalData,
    totalItems: Number(countRes[0]?.count || 0),
    userRole: role,
  }
}
