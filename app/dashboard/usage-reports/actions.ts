'use server'

import { revalidatePath } from 'next/cache'

import { randomUUID } from 'crypto'
import { SQL, and, asc, desc, eq, ilike, inArray, sql } from 'drizzle-orm'
import { PgColumn } from 'drizzle-orm/pg-core'
import { z } from 'zod'

import {
  auditLogs,
  consumables,
  roomConsumables,
  rooms,
  usageDetails,
  usageReports,
  user,
} from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

const itemSchema = z.object({
  roomConsumableId: z.string().min(1, 'Pilih stok/batch barang'),
  quantity: z.coerce.number().min(1, 'Minimal 1'),
})

const usageReportSchema = z.object({
  activityName: z.string().min(3, 'Nama kegiatan wajib diisi (Min. 3 karakter)'),
  activityDate: z.date('Tanggal kegiatan wajib diisi'),
  items: z.array(itemSchema).min(1, 'Minimal satu barang harus dilaporkan'),
})

const updateUsageSchema = usageReportSchema.extend({
  reportId: z.string().min(1),
})

type UsageReportFormData = z.infer<typeof usageReportSchema>

interface UsageDetailRow {
  reportId: string
  consumableId: string
  qtyUsed: string
  batchNumber: string | null
  consumable: {
    name: string
    unit: string
  } | null
}

export async function createUsageReport(data: UsageReportFormData & { roomId?: string }) {
  const session = await requireAuth({ roles: ['unit_staff', 'unit_admin'] })

  if (!session.user.unitId) {
    return { error: 'Akun Anda tidak terhubung dengan Unit Kerja/Jurusan.' }
  }

  const parsed = usageReportSchema.safeParse(data)
  if (!parsed.success) {
    return { error: 'Data tidak valid. Periksa kembali input Anda.' }
  }

  try {
    await db.transaction(async (tx) => {
      let targetRoomId = data.roomId

      if (!targetRoomId) {
        const [userRoom] = await tx
          .select()
          .from(rooms)
          .where(eq(rooms.unitId, session.user.unitId!))
          .limit(1)

        if (!userRoom) throw new Error('Unit kerja Anda belum memiliki ruangan yang terdaftar.')
        targetRoomId = userRoom.id
      }

      const reportId = randomUUID()

      await tx.insert(usageReports).values({
        id: reportId,
        userId: session.user.id,
        roomId: targetRoomId,
        activityName: parsed.data.activityName,
        activityDate: parsed.data.activityDate,
        createdAt: new Date(),
      })

      for (const item of parsed.data.items) {
        const [currentStock] = await tx
          .select()
          .from(roomConsumables)
          .where(
            and(
              eq(roomConsumables.id, item.roomConsumableId),
              eq(roomConsumables.roomId, targetRoomId),
            ),
          )
          .limit(1)

        if (!currentStock) {
          throw new Error(`Stok barang tidak ditemukan (ID: ${item.roomConsumableId}).`)
        }

        if (Number(currentStock.quantity) < item.quantity) {
          throw new Error(
            `Stok tidak cukup untuk batch ini. Tersedia: ${Number(currentStock.quantity || 0)}`,
          )
        }

        await tx.insert(usageDetails).values({
          id: randomUUID(),
          reportId: reportId,
          consumableId: currentStock.consumableId,
          qtyUsed: item.quantity.toString(),
          batchNumber: currentStock.batchNumber,
        })

        await tx
          .update(roomConsumables)
          .set({
            quantity: sql`${roomConsumables.quantity} - ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(roomConsumables.id, item.roomConsumableId))
      }

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'CREATE_USAGE_REPORT',
        tableName: 'usage_reports',
        recordId: reportId,
        newValues: { ...parsed.data, roomId: targetRoomId },
      })
    })

    revalidatePath('/dashboard/usage-reports')
    return { success: true, message: 'Laporan pemakaian berhasil dibuat.' }
  } catch (error: unknown) {
    console.error('Create Usage Report Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Gagal membuat laporan.'
    return { error: errorMessage }
  }
}

export async function updateUsageReport(
  data: z.infer<typeof updateUsageSchema> & { roomId?: string },
) {
  const session = await requireAuth({ roles: ['unit_staff', 'unit_admin'] })

  const parsed = updateUsageSchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid' }

  const { reportId, items, activityName, activityDate } = parsed.data

  try {
    await db.transaction(async (tx) => {
      const [existingReport] = await tx
        .select()
        .from(usageReports)
        .where(eq(usageReports.id, reportId))
        .limit(1)

      if (!existingReport) throw new Error('Laporan tidak ditemukan')

      if (session.user.role === 'unit_staff' && existingReport.userId !== session.user.id) {
        throw new Error('Anda hanya dapat mengubah laporan milik sendiri.')
      }

      const oldDetails = await tx
        .select()
        .from(usageDetails)
        .where(eq(usageDetails.reportId, reportId))

      for (const d of oldDetails) {
        const batchCondition = d.batchNumber
          ? eq(roomConsumables.batchNumber, d.batchNumber)
          : sql`${roomConsumables.batchNumber} IS NULL`

        const [existingStock] = await tx
          .select()
          .from(roomConsumables)
          .where(
            and(
              eq(roomConsumables.roomId, existingReport.roomId),
              eq(roomConsumables.consumableId, d.consumableId),
              batchCondition,
            ),
          )
          .limit(1)

        if (existingStock) {
          await tx
            .update(roomConsumables)
            .set({ quantity: sql`${roomConsumables.quantity} + ${d.qtyUsed}` })
            .where(eq(roomConsumables.id, existingStock.id))
        } else {
          await tx.insert(roomConsumables).values({
            id: randomUUID(),
            roomId: existingReport.roomId,
            consumableId: d.consumableId,
            quantity: d.qtyUsed,
            batchNumber: d.batchNumber,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        }
      }

      await tx.delete(usageDetails).where(eq(usageDetails.reportId, reportId))

      await tx
        .update(usageReports)
        .set({
          activityName,
          activityDate,
          updatedAt: new Date(),
        })
        .where(eq(usageReports.id, reportId))

      for (const item of items) {
        const [targetStock] = await tx
          .select()
          .from(roomConsumables)
          .where(eq(roomConsumables.id, item.roomConsumableId))
          .limit(1)

        if (!targetStock) throw new Error(`Stok baru tidak ditemukan/tidak valid.`)

        if (Number(targetStock.quantity) < item.quantity) {
          throw new Error(`Stok revisi tidak cukup. Tersedia: ${targetStock.quantity}`)
        }

        await tx.insert(usageDetails).values({
          id: randomUUID(),
          reportId: reportId,
          consumableId: targetStock.consumableId,
          qtyUsed: item.quantity.toString(),
          batchNumber: targetStock.batchNumber,
        })

        await tx
          .update(roomConsumables)
          .set({ quantity: sql`${roomConsumables.quantity} - ${item.quantity}` })
          .where(eq(roomConsumables.id, item.roomConsumableId))
      }
    })

    revalidatePath('/dashboard/usage-reports')
    return { success: true, message: 'Laporan berhasil diperbarui.' }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Gagal update laporan'
    return { error: msg }
  }
}

export async function deleteUsageReport(reportId: string) {
  const session = await requireAuth({ roles: ['unit_staff', 'unit_admin'] })

  try {
    await db.transaction(async (tx) => {
      const [report] = await tx
        .select()
        .from(usageReports)
        .where(eq(usageReports.id, reportId))
        .limit(1)

      if (!report) throw new Error('Laporan tidak ditemukan')

      if (session.user.role === 'unit_staff' && report.userId !== session.user.id) {
        throw new Error('Anda hanya dapat menghapus laporan milik sendiri.')
      }

      const details = await tx
        .select()
        .from(usageDetails)
        .where(eq(usageDetails.reportId, reportId))

      for (const d of details) {
        const batchCondition = d.batchNumber
          ? eq(roomConsumables.batchNumber, d.batchNumber)
          : sql`${roomConsumables.batchNumber} IS NULL`

        const [stock] = await tx
          .select()
          .from(roomConsumables)
          .where(
            and(
              eq(roomConsumables.roomId, report.roomId),
              eq(roomConsumables.consumableId, d.consumableId),
              batchCondition,
            ),
          )
          .limit(1)

        if (stock) {
          await tx
            .update(roomConsumables)
            .set({ quantity: sql`${roomConsumables.quantity} + ${d.qtyUsed}` })
            .where(eq(roomConsumables.id, stock.id))
        } else {
          await tx.insert(roomConsumables).values({
            id: randomUUID(),
            roomId: report.roomId,
            consumableId: d.consumableId,
            quantity: d.qtyUsed,
            batchNumber: d.batchNumber,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        }
      }

      await tx.delete(usageDetails).where(eq(usageDetails.reportId, reportId))
      await tx.delete(usageReports).where(eq(usageReports.id, reportId))
    })

    revalidatePath('/dashboard/usage-reports')
    return { success: true, message: 'Laporan dihapus & stok dikembalikan.' }
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : 'Gagal menghapus' }
  }
}

export async function getUsageReports(
  page: number = 1,
  limit: number = 10,
  query: string = '',
  sortCol: string = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc',
) {
  const session = await requireAuth({ roles: ['unit_staff', 'unit_admin', 'super_admin'] })

  const offset = (page - 1) * limit

  const conditions = []

  if (query) {
    conditions.push(ilike(usageReports.activityName, `%${query}%`))
  }

  if (session.user.role === 'unit_staff') {
    conditions.push(eq(usageReports.userId, session.user.id))
  }

  const whereClauseRaw = conditions.length > 0 ? and(...conditions) : undefined

  const columnMap: Record<string, PgColumn | SQL> = {
    activityName: usageReports.activityName,
    createdAt: usageReports.createdAt,
    activityDate: usageReports.activityDate,
  }

  const orderByClause =
    sortOrder === 'asc'
      ? asc(columnMap[sortCol] || usageReports.createdAt)
      : desc(columnMap[sortCol] || usageReports.createdAt)

  const baseQuery = db
    .select({
      id: usageReports.id,
      activityName: usageReports.activityName,
      activityDate: usageReports.activityDate,
      createdAt: usageReports.createdAt,
      userId: usageReports.userId,
      roomId: usageReports.roomId,
      user: {
        name: user.name,
        image: user.image,
      },
      room: {
        id: rooms.id,
        name: rooms.name,
      },
    })
    .from(usageReports)
    .leftJoin(user, eq(usageReports.userId, user.id))
    .leftJoin(rooms, eq(usageReports.roomId, rooms.id))

  const finalWhere = []
  if (whereClauseRaw) finalWhere.push(whereClauseRaw)

  if (session.user.role === 'unit_admin' || session.user.role === 'unit_staff') {
    finalWhere.push(eq(rooms.unitId, session.user.unitId!))
  }

  const finalWhereClause = finalWhere.length > 0 ? and(...finalWhere) : undefined

  const reportsData = await baseQuery
    .where(finalWhereClause)
    .orderBy(orderByClause)
    .limit(limit)
    .offset(offset)

  const countQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(usageReports)
    .leftJoin(rooms, eq(usageReports.roomId, rooms.id))
    .where(finalWhereClause)

  const [totalResult] = await countQuery
  const totalItems = Number(totalResult?.count || 0)

  const reportIds = reportsData.map((r) => r.id)

  let detailsData: UsageDetailRow[] = []

  if (reportIds.length > 0) {
    detailsData = await db
      .select({
        reportId: usageDetails.reportId,
        consumableId: usageDetails.consumableId,
        qtyUsed: usageDetails.qtyUsed,
        batchNumber: usageDetails.batchNumber,
        consumable: {
          name: consumables.name,
          unit: consumables.baseUnit,
        },
      })
      .from(usageDetails)
      .leftJoin(consumables, eq(usageDetails.consumableId, consumables.id))
      .where(inArray(usageDetails.reportId, reportIds))
  }

  const combinedData = reportsData.map((report) => {
    const reportDetails = detailsData.filter((d) => d.reportId === report.id)
    return {
      ...report,
      details: reportDetails.map((d) => ({
        consumableId: d.consumableId,
        qtyUsed: d.qtyUsed,
        batchNumber: d.batchNumber,
        consumable: d.consumable || { name: 'Unknown', unit: '-' },
      })),
    }
  })

  return {
    data: combinedData,
    totalItems,
  }
}
