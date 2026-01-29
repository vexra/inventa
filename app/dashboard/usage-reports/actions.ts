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
  consumableId: z.string().min(1, 'Pilih barang'),
  quantity: z.coerce.number().min(1, 'Minimal 1'),
})

const usageReportSchema = z.object({
  activityName: z.string().min(3, 'Nama kegiatan wajib diisi (Min. 3 karakter)'),
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
        createdAt: new Date(),
      })

      for (const item of parsed.data.items) {
        const [currentStock] = await tx
          .select()
          .from(roomConsumables)
          .where(
            and(
              eq(roomConsumables.roomId, targetRoomId),
              eq(roomConsumables.consumableId, item.consumableId),
            ),
          )
          .limit(1)

        if (!currentStock || Number(currentStock.quantity) < item.quantity) {
          throw new Error(
            `Stok tidak cukup untuk item ID: ${item.consumableId}. Tersedia: ${Number(
              currentStock?.quantity || 0,
            )}`,
          )
        }

        await tx.insert(usageDetails).values({
          id: randomUUID(),
          reportId: reportId,
          consumableId: item.consumableId,
          qtyUsed: item.quantity.toString(),
        })

        await tx
          .update(roomConsumables)
          .set({
            quantity: sql`${roomConsumables.quantity} - ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(roomConsumables.roomId, targetRoomId),
              eq(roomConsumables.consumableId, item.consumableId),
            ),
          )
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
  await requireAuth({ roles: ['unit_staff', 'unit_admin'] })
  const parsed = updateUsageSchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid' }

  const { reportId, items, activityName } = parsed.data

  try {
    await db.transaction(async (tx) => {
      const [existingReport] = await tx
        .select()
        .from(usageReports)
        .where(eq(usageReports.id, reportId))
        .limit(1)

      if (!existingReport) throw new Error('Laporan tidak ditemukan')

      const oldDetails = await tx
        .select()
        .from(usageDetails)
        .where(eq(usageDetails.reportId, reportId))

      for (const d of oldDetails) {
        await tx
          .update(roomConsumables)
          .set({ quantity: sql`${roomConsumables.quantity} + ${d.qtyUsed}` })
          .where(
            and(
              eq(roomConsumables.roomId, existingReport.roomId),
              eq(roomConsumables.consumableId, d.consumableId),
            ),
          )
      }
      await tx.delete(usageDetails).where(eq(usageDetails.reportId, reportId))

      await tx
        .update(usageReports)
        .set({ activityName, updatedAt: new Date() })
        .where(eq(usageReports.id, reportId))

      for (const item of items) {
        const [stock] = await tx
          .select()
          .from(roomConsumables)
          .where(
            and(
              eq(roomConsumables.roomId, existingReport.roomId),
              eq(roomConsumables.consumableId, item.consumableId),
            ),
          )
          .limit(1)

        if (!stock || Number(stock.quantity) < item.quantity)
          throw new Error(`Stok tidak cukup saat update untuk item ${item.consumableId}`)

        await tx.insert(usageDetails).values({
          id: randomUUID(),
          reportId: reportId,
          consumableId: item.consumableId,
          qtyUsed: item.quantity.toString(),
        })

        await tx
          .update(roomConsumables)
          .set({ quantity: sql`${roomConsumables.quantity} - ${item.quantity}` })
          .where(
            and(
              eq(roomConsumables.roomId, existingReport.roomId),
              eq(roomConsumables.consumableId, item.consumableId),
            ),
          )
      }
    })
    revalidatePath('/dashboard/usage-reports')
    return { success: true, message: 'Laporan diperbarui.' }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memperbarui laporan.'
    return { error: message }
  }
}

export async function deleteUsageReport(reportId: string) {
  await requireAuth({ roles: ['unit_staff', 'unit_admin'] })
  try {
    await db.transaction(async (tx) => {
      const [report] = await tx
        .select()
        .from(usageReports)
        .where(eq(usageReports.id, reportId))
        .limit(1)

      if (!report) throw new Error('Data tidak ditemukan')

      const details = await tx
        .select()
        .from(usageDetails)
        .where(eq(usageDetails.reportId, reportId))

      for (const d of details) {
        await tx
          .update(roomConsumables)
          .set({ quantity: sql`${roomConsumables.quantity} + ${d.qtyUsed}` })
          .where(
            and(
              eq(roomConsumables.roomId, report.roomId),
              eq(roomConsumables.consumableId, d.consumableId),
            ),
          )
      }

      await tx.delete(usageDetails).where(eq(usageDetails.reportId, reportId))
      await tx.delete(usageReports).where(eq(usageReports.id, reportId))
    })
    revalidatePath('/dashboard/usage-reports')
    return { success: true, message: 'Laporan dihapus & stok dikembalikan.' }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal menghapus laporan.'
    return { error: message }
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

  const baseFilter =
    session.user.role === 'unit_staff' ? eq(usageReports.userId, session.user.id) : undefined

  const searchFilter = query ? ilike(usageReports.activityName, `%${query}%`) : undefined

  const whereCondition =
    baseFilter && searchFilter ? and(baseFilter, searchFilter) : baseFilter || searchFilter

  const columnMap: Record<string, PgColumn | SQL> = {
    activityName: usageReports.activityName,
    createdAt: usageReports.createdAt,
    userName: user.name,
    roomName: rooms.name,
  }

  const orderByClause =
    sortOrder === 'asc'
      ? asc(columnMap[sortCol] || usageReports.createdAt)
      : desc(columnMap[sortCol] || usageReports.createdAt)

  const reportsData = await db
    .select({
      id: usageReports.id,
      activityName: usageReports.activityName,
      createdAt: usageReports.createdAt,
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
    .where(whereCondition)
    .orderBy(orderByClause)
    .limit(limit)
    .offset(offset)

  const reportIds = reportsData.map((r) => r.id)

  let detailsData: UsageDetailRow[] = []

  if (reportIds.length > 0) {
    detailsData = await db
      .select({
        reportId: usageDetails.reportId,
        consumableId: usageDetails.consumableId,
        qtyUsed: usageDetails.qtyUsed,
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
        consumable: d.consumable || { name: 'Unknown', unit: '-' },
      })),
    }
  })

  const [countRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(usageReports)
    .where(whereCondition)

  return {
    data: combinedData,
    totalItems: Number(countRes?.count || 0),
  }
}
