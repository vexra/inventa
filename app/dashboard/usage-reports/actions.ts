'use server'

import { revalidatePath } from 'next/cache'

import { randomUUID } from 'crypto'
import { and, desc, eq, ilike, sql } from 'drizzle-orm'
import { z } from 'zod'

import { auditLogs, roomConsumables, rooms, usageDetails, usageReports } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

const itemSchema = z.object({
  consumableId: z.string().min(1, 'Pilih barang'),
  quantity: z.coerce.number().min(1, 'Minimal 1'),
})

const usageSchema = z.object({
  activityName: z.string().min(1, 'Nama kegiatan wajib diisi'),
  items: z.array(itemSchema).min(1, 'Minimal satu barang harus dipilih'),
})

export async function createUsageReport(data: z.infer<typeof usageSchema>) {
  const session = await requireAuth({ roles: ['unit_staff'] })

  if (!session.user.unitId) {
    return { error: 'Akun Anda tidak terhubung dengan Unit Kerja.' }
  }

  const parsed = usageSchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid.' }

  const { items, activityName } = parsed.data

  try {
    await db.transaction(async (tx) => {
      const [userRoom] = await tx
        .select()
        .from(rooms)
        .where(eq(rooms.unitId, session.user.unitId!))
        .limit(1)

      if (!userRoom) throw new Error('Ruangan unit belum dikonfigurasi.')

      const reportId = randomUUID()

      await tx.insert(usageReports).values({
        id: reportId,
        userId: session.user.id,
        roomId: userRoom.id,
        activityName: activityName,
        createdAt: new Date(),
      })

      for (const item of items) {
        const [currentStock] = await tx
          .select()
          .from(roomConsumables)
          .where(
            and(
              eq(roomConsumables.roomId, userRoom.id),
              eq(roomConsumables.consumableId, item.consumableId),
            ),
          )
          .limit(1)

        if (!currentStock || Number(currentStock.quantity) < item.quantity) {
          throw new Error(
            `Stok tidak mencukupi untuk item ID: ${item.consumableId}. Sisa: ${Number(currentStock?.quantity || 0)}`,
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
              eq(roomConsumables.roomId, userRoom.id),
              eq(roomConsumables.consumableId, item.consumableId),
            ),
          )
      }

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'CREATE',
        tableName: 'usage_reports',
        recordId: reportId,
        newValues: { items, activityName, roomId: userRoom.id },
      })
    })

    revalidatePath('/dashboard/usage-reports')
    revalidatePath('/dashboard/room-stocks')
    return { success: true, message: 'Laporan pemakaian berhasil disimpan.' }
  } catch (error) {
    console.error('Usage Report Error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Gagal menyimpan laporan.'

    return { error: errorMessage }
  }
}

export async function getUsageReports(page: number = 1, limit: number = 10, query?: string) {
  const session = await requireAuth({ roles: ['unit_staff'] })
  const offset = (page - 1) * limit

  const searchCondition = query ? ilike(usageReports.activityName, `%${query}%`) : undefined
  const whereCondition = and(eq(usageReports.userId, session.user.id), searchCondition)

  const data = await db
    .select({
      id: usageReports.id,
      activityName: usageReports.activityName,
      createdAt: usageReports.createdAt,
      itemCount: sql<number>`count(${usageDetails.id})`,
    })
    .from(usageReports)
    .leftJoin(usageDetails, eq(usageReports.id, usageDetails.reportId))
    .where(whereCondition)
    .groupBy(usageReports.id)
    .orderBy(desc(usageReports.createdAt))
    .limit(limit)
    .offset(offset)

  const countRes = await db
    .select({ count: sql<number>`count(*)` })
    .from(usageReports)
    .where(whereCondition)

  return {
    data,
    totalItems: Number(countRes[0]?.count || 0),
  }
}
