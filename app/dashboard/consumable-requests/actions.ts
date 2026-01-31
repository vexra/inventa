'use server'

import { revalidatePath } from 'next/cache'

import { randomUUID } from 'crypto'
import { SQL, and, asc, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm'
import { PgColumn } from 'drizzle-orm/pg-core'
import { z } from 'zod'

import {
  auditLogs,
  consumables,
  notifications,
  requestItemAllocations,
  requestItems,
  requestTimelines,
  requests,
  roomConsumables,
  rooms,
  units,
  user,
  warehouseStocks,
} from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email'

async function sendNotificationHelper(
  tx: any,
  userIds: string[],
  title: string,
  message: string,
  requestId: string,
  requestCode: string,
) {
  if (!userIds || userIds.length === 0) return

  const detailLink = `/dashboard/consumable-requests/${requestId}`
  const fullUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${detailLink}`

  for (const uid of userIds) {
    await tx.insert(notifications).values({
      id: randomUUID(),
      userId: uid,
      title,
      message,
      link: detailLink,
      isRead: false,
      createdAt: new Date(),
    })
  }

  try {
    const usersToEmail = await tx
      .select({ email: user.email, name: user.name })
      .from(user)
      .where(inArray(user.id, userIds))

    await Promise.all(
      usersToEmail.map((u: any) => {
        if (!u.email) return Promise.resolve()

        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="background-color: #f3f4f6; padding: 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333;">
            <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
              
              <div style="background-color: #2563EB; padding: 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Inventa FMIPA Unila</h1>
              </div>
              
              <div style="padding: 30px 20px;">
                <h2 style="margin-top: 0; font-size: 18px; color: #1f2937;">${title}</h2>
                <p style="line-height: 1.6; color: #4b5563;">Halo <strong>${u.name}</strong>,</p>
                <p style="line-height: 1.6; color: #4b5563;">${message}</p>
                
                <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 15px; margin: 20px 0; text-align: center;">
                  <span style="display: block; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Kode Permintaan</span>
                  <span style="display: block; font-size: 18px; font-weight: bold; color: #2563EB; margin-top: 5px; font-family: monospace;">${requestCode}</span>
                </div>

                <p style="line-height: 1.6; color: #4b5563;">
                  Silakan klik tombol di bawah ini untuk melihat detail permintaan.
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${fullUrl}" style="background-color: #2563EB; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Lihat Detail Permintaan</a>
                </div>
              </div>

              <div style="background-color: #f9fafb; padding: 15px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                  Notifikasi otomatis sistem Inventa.<br>
                  &copy; ${new Date().getFullYear()} Inventa FMIPA Unila.
                </p>
              </div>
            </div>
          </body>
          </html>
        `

        return sendEmail({
          to: u.email,
          subject: `[Inventa] ${title} - ${requestCode}`,
          html: htmlContent,
        }).catch((err: any) => console.error(`Gagal kirim email ke ${u.email}:`, err))
      }),
    )
  } catch (error) {
    console.error('Error in sendNotificationHelper:', error)
  }
}

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

      if (!selectedRoom) throw new Error('Ruangan tidak valid.')

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
        if (currentTotalStock < item.quantity) {
          throw new Error(
            `Estimasi stok tidak cukup untuk item ID: ${item.consumableId}. Tersedia: ${currentTotalStock}`,
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
        approvedByUnitId: session.user.role === 'unit_admin' ? session.user.id : null,
      })

      for (const item of items) {
        await tx.insert(requestItems).values({
          id: randomUUID(),
          requestId: requestId,
          consumableId: item.consumableId,
          qtyRequested: item.quantity.toString(),
          qtyApproved: item.quantity.toString(),
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
        newValues: { code, items, status: initialStatus },
      })

      if (initialStatus === 'PENDING_UNIT') {
        const unitAdmins = await tx
          .select({ id: user.id })
          .from(user)
          .where(and(eq(user.unitId, session.user.unitId!), eq(user.role, 'unit_admin')))

        await sendNotificationHelper(
          tx,
          unitAdmins.map((u) => u.id),
          'Permintaan Baru Masuk',
          `Staff ${session.user.name} membuat permintaan baru. Menunggu persetujuan Unit.`,
          requestId,
          code,
        )
      } else {
        const [unitData] = await tx
          .select({ facultyId: units.facultyId })
          .from(units)
          .where(eq(units.id, session.user.unitId!))
          .limit(1)

        if (unitData?.facultyId) {
          const facultyAdmins = await tx
            .select({ id: user.id })
            .from(user)
            .where(and(eq(user.facultyId, unitData.facultyId), eq(user.role, 'faculty_admin')))

          await sendNotificationHelper(
            tx,
            facultyAdmins.map((u) => u.id),
            'Permintaan Baru Fakultas',
            `Unit Admin ${session.user.name} membuat permintaan. Menunggu persetujuan Fakultas.`,
            requestId,
            code,
          )
        }
      }
    })

    revalidatePath('/dashboard/consumable-requests')
    return { success: true, message: 'Permintaan berhasil dikirim.' }
  } catch (error) {
    console.error('Create Request Error:', error)
    return { error: error instanceof Error ? error.message : 'Gagal membuat permintaan.' }
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

      if (!existingRequest) throw new Error('Permintaan tidak ditemukan.')

      const isOwner = existingRequest.requesterId === session.user.id
      const isAdmin = session.user.role === 'unit_admin'
      if (!isOwner && !isAdmin) throw new Error('Akses ditolak.')

      if (!['PENDING_UNIT', 'REJECTED'].includes(existingRequest.status || '')) {
        throw new Error('Permintaan sudah diproses, tidak bisa diedit.')
      }

      await tx
        .update(requests)
        .set({
          roomId,
          targetWarehouseId,
          description,
          status: 'PENDING_UNIT',
          rejectionReason: null,
          approvedByUnitId: null,
          approvedByFacultyId: null,
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
          qtyApproved: item.quantity.toString(),
        })
      }

      await tx.insert(requestTimelines).values({
        id: randomUUID(),
        requestId: requestId,
        status: 'PENDING_UNIT',
        actorId: session.user.id,
        notes: 'Detail permintaan diperbarui.',
      })

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'UPDATE',
        tableName: 'requests',
        recordId: requestId,
        oldValues: existingRequest,
        newValues: { roomId, targetWarehouseId, description, items, status: 'PENDING_UNIT' },
      })

      if (session.user.role === 'unit_staff') {
        const unitAdmins = await tx
          .select({ id: user.id })
          .from(user)
          .where(and(eq(user.unitId, session.user.unitId!), eq(user.role, 'unit_admin')))

        await sendNotificationHelper(
          tx,
          unitAdmins.map((u) => u.id),
          'Revisi Permintaan Masuk',
          `Permintaan telah diperbarui/direvisi oleh staff. Mohon dicek kembali.`,
          requestId,
          existingRequest.requestCode!,
        )
      }
    })

    revalidatePath('/dashboard/consumable-requests')
    return { success: true, message: 'Permintaan berhasil diperbarui.' }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Gagal update.' }
  }
}

export async function cancelRequest(requestId: string) {
  const session = await requireAuth({ roles: ['unit_staff', 'unit_admin'] })

  try {
    const [existing] = await db.select().from(requests).where(eq(requests.id, requestId)).limit(1)
    if (!existing) return { error: 'Not found.' }

    if (existing.requesterId !== session.user.id && session.user.role !== 'unit_admin') {
      return { error: 'Unauthorized.' }
    }
    if (!['PENDING_UNIT', 'REJECTED'].includes(existing.status || '')) {
      return { error: 'Status invalid untuk pembatalan.' }
    }

    await db.transaction(async (tx) => {
      await tx.delete(requests).where(eq(requests.id, requestId))

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'DELETE',
        tableName: 'requests',
        recordId: requestId,
        oldValues: existing,
      })
    })

    revalidatePath('/dashboard/consumable-requests')
    return { success: true, message: 'Berhasil dihapus.' }
  } catch {
    return { error: 'Gagal menghapus.' }
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

      if (!existingRequest) throw new Error('Permintaan tidak ditemukan.')

      if (action === 'REJECT') {
        await tx
          .update(requests)
          .set({ status: 'REJECTED', rejectionReason: reason, updatedAt: new Date() })
          .where(eq(requests.id, requestId))

        await tx.insert(requestTimelines).values({
          id: randomUUID(),
          requestId: requestId,
          status: 'REJECTED',
          actorId: session.user.id,
          notes: `Ditolak: ${reason}`,
        })

        await tx.insert(auditLogs).values({
          id: randomUUID(),
          userId: session.user.id,
          action: 'REJECT',
          tableName: 'requests',
          recordId: requestId,
          newValues: { status: 'REJECTED', rejectionReason: reason },
        })

        await sendNotificationHelper(
          tx,
          [existingRequest.requesterId!],
          'Permintaan Ditolak',
          `Maaf, permintaan Anda ditolak oleh ${
            userRole === 'unit_admin' ? 'Unit' : 'Fakultas'
          }. Alasan: ${reason}`,
          requestId,
          existingRequest.requestCode!,
        )

        return
      }

      let newStatus: typeof requests.$inferSelect.status = 'PENDING_FACULTY'

      if (userRole === 'unit_admin') {
        if (existingRequest.status !== 'PENDING_UNIT') {
          throw new Error('Status harus PENDING_UNIT.')
        }
        newStatus = 'PENDING_FACULTY'

        await tx
          .update(requests)
          .set({
            status: newStatus,
            approvedByUnitId: session.user.id,
            updatedAt: new Date(),
          })
          .where(eq(requests.id, requestId))

        await sendNotificationHelper(
          tx,
          [existingRequest.requesterId!],
          'Disetujui Unit',
          `Permintaan disetujui Unit. Sekarang menunggu persetujuan Fakultas.`,
          requestId,
          existingRequest.requestCode!,
        )

        const [userData] = await tx
          .select({ facultyId: units.facultyId })
          .from(user)
          .leftJoin(units, eq(user.unitId, units.id))
          .where(eq(user.id, existingRequest.requesterId!))
          .limit(1)

        if (userData?.facultyId) {
          const facultyAdmins = await tx
            .select({ id: user.id })
            .from(user)
            .where(and(eq(user.facultyId, userData.facultyId), eq(user.role, 'faculty_admin')))

          await sendNotificationHelper(
            tx,
            facultyAdmins.map((u) => u.id),
            'Approval Diperlukan',
            `Permintaan dari Unit telah disetujui dan menunggu verifikasi Fakultas.`,
            requestId,
            existingRequest.requestCode!,
          )
        }
      } else if (userRole === 'faculty_admin') {
        if (existingRequest.status !== 'PENDING_FACULTY') {
          throw new Error('Status harus PENDING_FACULTY.')
        }
        newStatus = 'APPROVED'

        const itemsRequested = await tx
          .select({
            id: requestItems.id,
            requestId: requestItems.requestId,
            consumableId: requestItems.consumableId,
            qtyRequested: requestItems.qtyRequested,
            qtyApproved: requestItems.qtyApproved,
            itemName: consumables.name,
          })
          .from(requestItems)
          .innerJoin(consumables, eq(requestItems.consumableId, consumables.id))
          .where(eq(requestItems.requestId, requestId))

        for (const item of itemsRequested) {
          const qtyNeeded = Number(item.qtyApproved || item.qtyRequested)
          let remainingQtyNeeded = qtyNeeded

          const availableStocks = await tx
            .select()
            .from(warehouseStocks)
            .where(
              and(
                eq(warehouseStocks.warehouseId, existingRequest.targetWarehouseId!),
                eq(warehouseStocks.consumableId, item.consumableId),
              ),
            )
            .orderBy(asc(warehouseStocks.expiryDate), asc(warehouseStocks.updatedAt))

          const totalAvailable = availableStocks.reduce((acc, s) => acc + Number(s.quantity), 0)

          if (totalAvailable < qtyNeeded) {
            throw new Error(
              `Stok tidak mencukupi untuk barang "${item.itemName}". Dibutuhkan: ${qtyNeeded}, Tersedia di gudang: ${totalAvailable}.`,
            )
          }

          for (const stock of availableStocks) {
            if (remainingQtyNeeded <= 0) break

            const stockQty = Number(stock.quantity)
            const qtyToTake = Math.min(stockQty, remainingQtyNeeded)

            await tx.insert(requestItemAllocations).values({
              id: randomUUID(),
              requestItemId: item.id,
              warehouseId: stock.warehouseId,
              consumableId: stock.consumableId,
              batchNumber: stock.batchNumber,
              expiryDate: stock.expiryDate,
              quantity: qtyToTake.toString(),
            })

            if (stockQty === qtyToTake) {
              await tx.delete(warehouseStocks).where(eq(warehouseStocks.id, stock.id))
            } else {
              await tx
                .update(warehouseStocks)
                .set({ quantity: (stockQty - qtyToTake).toString() })
                .where(eq(warehouseStocks.id, stock.id))
            }

            remainingQtyNeeded -= qtyToTake
          }
        }

        await tx
          .update(requests)
          .set({
            status: newStatus,
            approvedByFacultyId: session.user.id,
            updatedAt: new Date(),
          })
          .where(eq(requests.id, requestId))

        await sendNotificationHelper(
          tx,
          [existingRequest.requesterId!],
          'Permintaan Disetujui',
          `Permintaan telah disetujui Fakultas. Stok dialokasikan & diteruskan ke Gudang.`,
          requestId,
          existingRequest.requestCode!,
        )

        const warehouseStaffs = await tx
          .select({ id: user.id })
          .from(user)
          .where(
            and(
              eq(user.warehouseId, existingRequest.targetWarehouseId!),
              eq(user.role, 'warehouse_staff'),
            ),
          )

        await sendNotificationHelper(
          tx,
          warehouseStaffs.map((u) => u.id),
          'Permintaan Masuk Gudang',
          `Permintaan disetujui Fakultas. Harap siapkan barang.`,
          requestId,
          existingRequest.requestCode!,
        )
      }

      await tx.insert(requestTimelines).values({
        id: randomUUID(),
        requestId: requestId,
        status: newStatus,
        actorId: session.user.id,
        notes:
          userRole === 'faculty_admin'
            ? 'Disetujui Fakultas. Stok telah dialokasikan.'
            : 'Disetujui Unit. Menunggu Fakultas.',
      })

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'APPROVE',
        tableName: 'requests',
        recordId: requestId,
        newValues: { status: newStatus, approvedBy: session.user.id },
      })
    })

    revalidatePath('/dashboard/consumable-requests')
    return { success: true, message: 'Permintaan berhasil disetujui.' }
  } catch (error) {
    console.error('Verify Error:', error)
    return { error: error instanceof Error ? error.message : 'Gagal memproses approval.' }
  }
}

export async function updateRequestStatusByWarehouse(
  requestId: string,
  newStatus: 'PROCESSING' | 'READY_TO_PICKUP',
) {
  const session = await requireAuth({ roles: ['warehouse_staff'] })

  try {
    await db.transaction(async (tx) => {
      const [req] = await tx
        .select()
        .from(requests)
        .where(
          and(
            eq(requests.id, requestId),
            eq(requests.targetWarehouseId, session.user.warehouseId!),
          ),
        )
        .limit(1)

      if (!req) throw new Error('Request tidak ditemukan di gudang Anda.')

      if (newStatus === 'PROCESSING' && req.status !== 'APPROVED') {
        throw new Error('Hanya request APPROVED yang bisa diproses.')
      }
      if (newStatus === 'READY_TO_PICKUP' && req.status !== 'PROCESSING') {
        throw new Error('Request harus PROCESSING dulu sebelum siap diambil.')
      }

      await tx
        .update(requests)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(requests.id, requestId))

      await tx.insert(requestTimelines).values({
        id: randomUUID(),
        requestId: requestId,
        status: newStatus,
        actorId: session.user.id,
        notes: newStatus === 'PROCESSING' ? 'Sedang disiapkan.' : 'Siap diambil user.',
      })

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'UPDATE_STATUS',
        tableName: 'requests',
        recordId: requestId,
        oldValues: { status: req.status },
        newValues: { status: newStatus },
      })

      const notifTitle =
        newStatus === 'PROCESSING' ? 'Barang Sedang Disiapkan' : 'Barang Siap Diambil'
      const notifMsg =
        newStatus === 'PROCESSING'
          ? `Gudang sedang menyiapkan barang.`
          : `Barang SUDAH SIAP. Silakan datang ke gudang dengan QR Code.`

      await sendNotificationHelper(
        tx,
        [req.requesterId!],
        notifTitle,
        notifMsg,
        requestId,
        req.requestCode!,
      )
    })

    revalidatePath('/dashboard/consumable-requests')
    return { success: true, message: `Status updated to ${newStatus}` }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Gagal update status gudang.' }
  }
}

export async function getConsumableRequests(
  page: number = 1,
  limit: number = 10,
  query: string = '',
  statusFilter: string = 'all',
  sortCol: string = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc',
) {
  const session = await requireAuth({
    roles: ['unit_staff', 'unit_admin', 'faculty_admin', 'warehouse_staff'],
  })

  const { role, id: userId, unitId, facultyId, warehouseId } = session.user
  const offset = (page - 1) * limit

  let searchCondition = undefined
  if (query) {
    searchCondition = or(ilike(requests.requestCode, `%${query}%`), ilike(user.name, `%${query}%`))
  }

  let uiStatusCondition = undefined
  if (statusFilter && statusFilter !== 'all') {
    uiStatusCondition = eq(
      requests.status,
      statusFilter as NonNullable<(typeof requests.$inferSelect)['status']>,
    )
  }

  let roleCondition

  if (role === 'faculty_admin') {
    roleCondition = and(
      eq(units.facultyId, facultyId!),
      inArray(requests.status, [
        'PENDING_FACULTY',
        'APPROVED',
        'PROCESSING',
        'READY_TO_PICKUP',
        'COMPLETED',
        'REJECTED',
      ]),
    )
  } else if (role === 'warehouse_staff') {
    roleCondition = and(
      eq(requests.targetWarehouseId, warehouseId!),
      inArray(requests.status, ['APPROVED', 'PROCESSING', 'READY_TO_PICKUP', 'COMPLETED']),
    )
  } else if (role === 'unit_admin') {
    roleCondition = eq(user.unitId, unitId!)
  } else {
    roleCondition = eq(requests.requesterId, userId)
  }

  const whereCondition = and(roleCondition, searchCondition, uiStatusCondition)

  const sortMap: Record<string, PgColumn | SQL> = {
    code: requests.requestCode,
    status: requests.status,
    createdAt: requests.createdAt,
    requester: user.name,
    room: rooms.name,
  }

  const orderColumn = sortMap[sortCol] || requests.createdAt
  const orderBy = sortOrder === 'desc' ? desc(orderColumn) : asc(orderColumn)

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
    .orderBy(orderBy)
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
        qtyApproved: requestItems.qtyApproved,
      })
      .from(requestItems)
      .where(inArray(requestItems.requestId, requestIds))

    itemsData.forEach((item) => {
      if (!item.requestId) return
      if (!itemsMap[item.requestId]) itemsMap[item.requestId] = []

      itemsMap[item.requestId].push({
        consumableId: item.consumableId,
        quantity: Number(item.qtyApproved ?? item.qtyRequested),
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

export async function completeRequestByQR(requestId: string) {
  const session = await requireAuth({
    roles: ['warehouse_staff'],
  })

  try {
    await db.transaction(async (tx) => {
      const [request] = await tx.select().from(requests).where(eq(requests.id, requestId)).limit(1)

      if (!request) {
        throw new Error('QR Code tidak valid. Data permintaan tidak ditemukan.')
      }

      if (request.status !== 'READY_TO_PICKUP') {
        if (request.status === 'COMPLETED') {
          throw new Error('Permintaan ini sudah selesai diambil sebelumnya.')
        }
        throw new Error(`Status permintaan belum siap diambil (Status: ${request.status}).`)
      }

      const allocations = await tx
        .select({
          consumableId: requestItemAllocations.consumableId,
          batchNumber: requestItemAllocations.batchNumber,
          expiryDate: requestItemAllocations.expiryDate,
          quantity: requestItemAllocations.quantity,
        })
        .from(requestItemAllocations)
        .innerJoin(requestItems, eq(requestItemAllocations.requestItemId, requestItems.id))
        .where(eq(requestItems.requestId, requestId))

      if (allocations.length === 0) {
        throw new Error('Data alokasi stok korup atau hilang. Hubungi admin.')
      }

      for (const alloc of allocations) {
        const whereConditions = [
          eq(roomConsumables.roomId, request.roomId),
          eq(roomConsumables.consumableId, alloc.consumableId),
        ]

        if (alloc.batchNumber) {
          whereConditions.push(eq(roomConsumables.batchNumber, alloc.batchNumber))
        } else {
          whereConditions.push(isNull(roomConsumables.batchNumber))
        }

        if (alloc.expiryDate) {
          whereConditions.push(eq(roomConsumables.expiryDate, alloc.expiryDate))
        } else {
          whereConditions.push(isNull(roomConsumables.expiryDate))
        }

        const [existingRoomStock] = await tx
          .select()
          .from(roomConsumables)
          .where(and(...whereConditions))
          .limit(1)

        if (existingRoomStock) {
          await tx
            .update(roomConsumables)
            .set({
              quantity: sql`${roomConsumables.quantity} + ${alloc.quantity}`,
              updatedAt: new Date(),
            })
            .where(eq(roomConsumables.id, existingRoomStock.id))
        } else {
          await tx.insert(roomConsumables).values({
            id: randomUUID(),
            roomId: request.roomId,
            consumableId: alloc.consumableId,
            batchNumber: alloc.batchNumber,
            expiryDate: alloc.expiryDate,
            quantity: alloc.quantity,
          })
        }
      }

      await tx
        .update(requests)
        .set({
          status: 'COMPLETED',
          updatedAt: new Date(),
        })
        .where(eq(requests.id, requestId))

      await tx.insert(requestTimelines).values({
        id: randomUUID(),
        requestId: requestId,
        status: 'COMPLETED',
        actorId: session.user.id,
        notes: `Barang diterima via Scan QR oleh ${session.user.name}`,
      })

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'COMPLETE',
        tableName: 'requests',
        recordId: requestId,
        newValues: { status: 'COMPLETED' },
      })

      await sendNotificationHelper(
        tx,
        [request.requesterId!],
        'Transaksi Selesai',
        `Permintaan telah selesai. Barang sudah ditambahkan ke stok ruangan.`,
        requestId,
        request.requestCode!,
      )
    })

    revalidatePath('/dashboard/consumable-requests')

    return {
      success: true,
      message: 'Verifikasi berhasil! Stok masuk ke ruangan sesuai Batch & Expired date.',
    }
  } catch (error) {
    console.error('QR Scan Error:', error)
    return { error: error instanceof Error ? error.message : 'Gagal memproses QR Code.' }
  }
}
