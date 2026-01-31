'use server'

import { revalidatePath } from 'next/cache'

import { randomUUID } from 'crypto'
import { SQL, and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import { PgColumn } from 'drizzle-orm/pg-core'
import { z } from 'zod'

import {
  auditLogs,
  consumables,
  notifications,
  procurementConsumables,
  procurementTimelines,
  procurements,
  user,
  warehouseStocks,
} from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { goodsReceiptSchema } from '@/lib/validations/inbound'

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

async function sendNotificationHelper(
  tx: Transaction,
  userIds: string[],
  title: string,
  message: string,
  procurementId: string,
  procurementCode: string,
) {
  if (!userIds || userIds.length === 0) return

  const detailLink = `/dashboard/procurements/${procurementId}`
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
      usersToEmail.map((u: { email: string; name: string | null }) => {
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
                <p style="line-height: 1.6; color: #4b5563;">Halo <strong>${u.name || 'User'}</strong>,</p>
                <p style="line-height: 1.6; color: #4b5563;">${message}</p>
                <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 15px; margin: 20px 0; text-align: center;">
                  <span style="display: block; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Kode Pengadaan</span>
                  <span style="display: block; font-size: 18px; font-weight: bold; color: #2563EB; margin-top: 5px; font-family: monospace;">${procurementCode}</span>
                </div>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${fullUrl}" style="background-color: #2563EB; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Lihat Detail Pengadaan</a>
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
          subject: `[Inventa] ${title} - ${procurementCode}`,
          html: htmlContent,
        }).catch((err: unknown) => console.error(`Gagal kirim email ke ${u.email}:`, err))
      }),
    )
  } catch (error) {
    console.error('Error in sendNotificationHelper:', error)
  }
}

const itemSchema = z.object({
  consumableId: z.string().min(1, 'Pilih barang'),
  quantity: z.coerce.number().min(1, 'Minimal 1'),
  description: z.string().optional(),
})

const procurementSchema = z.object({
  description: z.string().min(3, 'Deskripsi pengadaan wajib diisi (Min. 3 karakter)'),
  items: z.array(itemSchema).min(1, 'Minimal satu barang harus dipilih'),
})

type ProcurementFormData = z.infer<typeof procurementSchema>

export async function createProcurement(data: ProcurementFormData) {
  const session = await requireAuth({ roles: ['warehouse_staff'] })

  if (!session.user.warehouseId) {
    return { error: 'Anda tidak terdaftar di gudang manapun.' }
  }

  const parsed = procurementSchema.safeParse(data)
  if (!parsed.success) {
    return { error: 'Data tidak valid.' }
  }

  const procurementId = randomUUID()
  const code = `PO/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`

  try {
    await db.transaction(async (tx) => {
      await tx.insert(procurements).values({
        id: procurementId,
        procurementCode: code,
        userId: session.user.id,
        warehouseId: session.user.warehouseId!,
        status: 'PENDING',
        description: parsed.data.description,
        notes: null,
      })

      const itemsToInsert = parsed.data.items.map((item) => ({
        id: randomUUID(),
        procurementId: procurementId,
        consumableId: item.consumableId,
        warehouseId: session.user.warehouseId!,
        quantity: item.quantity.toString(),
      }))
      await tx.insert(procurementConsumables).values(itemsToInsert)

      await tx.insert(procurementTimelines).values({
        id: randomUUID(),
        procurementId: procurementId,
        status: 'PENDING',
        actorId: session.user.id,
        notes: 'Pengajuan baru dibuat',
      })

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'CREATE',
        tableName: 'procurements',
        recordId: procurementId,
        newValues: { ...parsed.data, procurementCode: code },
      })

      const facultyAdmins = await tx
        .select({ id: user.id })
        .from(user)
        .where(eq(user.role, 'faculty_admin'))

      await sendNotificationHelper(
        tx,
        facultyAdmins.map((u: { id: string }) => u.id),
        'Pengajuan Pengadaan Baru',
        `Staf gudang ${session.user.name} membuat pengajuan pengadaan baru. Menunggu persetujuan.`,
        procurementId,
        code,
      )
    })

    revalidatePath('/dashboard/procurements')
    return { success: true, message: 'Pengajuan berhasil dibuat' }
  } catch (error) {
    console.error('Create procurement error:', error)
    return { error: 'Gagal membuat pengajuan.' }
  }
}

export async function updateProcurement(id: string, data: ProcurementFormData) {
  const session = await requireAuth({ roles: ['warehouse_staff'] })

  const [existingProcurement] = await db
    .select()
    .from(procurements)
    .where(eq(procurements.id, id))
    .limit(1)

  if (!existingProcurement) return { error: 'Pengajuan tidak ditemukan.' }
  if (existingProcurement.userId !== session.user.id) return { error: 'Anda tidak memiliki akses.' }

  if (existingProcurement.status !== 'PENDING' && existingProcurement.status !== 'REJECTED') {
    return { error: 'Pengajuan yang sudah diproses tidak dapat diedit.' }
  }

  const parsed = procurementSchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid.' }

  try {
    await db.transaction(async (tx) => {
      const oldItems = await tx
        .select()
        .from(procurementConsumables)
        .where(eq(procurementConsumables.procurementId, id))
      const oldData = { ...existingProcurement, items: oldItems }

      await tx
        .update(procurements)
        .set({
          description: parsed.data.description,
          notes: null,
          status: 'PENDING',
          updatedAt: new Date(),
        })
        .where(eq(procurements.id, id))

      await tx.delete(procurementConsumables).where(eq(procurementConsumables.procurementId, id))

      const itemsToInsert = parsed.data.items.map((item) => ({
        id: randomUUID(),
        procurementId: id,
        consumableId: item.consumableId,
        warehouseId: session.user.warehouseId!,
        quantity: item.quantity.toString(),
      }))

      await tx.insert(procurementConsumables).values(itemsToInsert)

      const timelineNote =
        existingProcurement.status === 'REJECTED'
          ? 'Pengajuan diperbaiki dan diajukan ulang (Resubmit)'
          : 'Pengajuan diedit (Revisi Draft)'

      await tx.insert(procurementTimelines).values({
        id: randomUUID(),
        procurementId: id,
        status: 'PENDING',
        actorId: session.user.id,
        notes: timelineNote,
      })

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'UPDATE',
        tableName: 'procurements',
        recordId: id,
        oldValues: oldData,
        newValues: { ...parsed.data, status: 'PENDING' },
      })

      const facultyAdmins = await tx
        .select({ id: user.id })
        .from(user)
        .where(eq(user.role, 'faculty_admin'))

      await sendNotificationHelper(
        tx,
        facultyAdmins.map((u: { id: string }) => u.id),
        'Revisi Pengadaan Masuk',
        `Pengajuan pengadaan (${existingProcurement.procurementCode}) telah direvisi/diajukan ulang oleh staf gudang.`,
        id,
        existingProcurement.procurementCode!,
      )
    })

    revalidatePath('/dashboard/procurements')
    return { success: true, message: 'Pengajuan berhasil diperbarui.' }
  } catch (error) {
    console.error('Update procurement error:', error)
    return { error: 'Gagal mengupdate pengajuan.' }
  }
}

export async function verifyProcurement(
  id: string,
  decision: 'APPROVED' | 'REJECTED',
  reason?: string,
) {
  const session = await requireAuth({ roles: ['faculty_admin', 'super_admin'] })

  if (decision === 'REJECTED' && !reason) {
    return { error: 'Alasan penolakan wajib diisi.' }
  }

  try {
    await db.transaction(async (tx) => {
      const [existingProcurement] = await tx
        .select()
        .from(procurements)
        .where(eq(procurements.id, id))
        .limit(1)

      if (!existingProcurement) throw new Error('Pengajuan tidak ditemukan.')

      await tx
        .update(procurements)
        .set({
          status: decision,
          notes: decision === 'REJECTED' ? reason : undefined,
          updatedAt: new Date(),
        })
        .where(eq(procurements.id, id))

      await tx.insert(procurementTimelines).values({
        id: randomUUID(),
        procurementId: id,
        status: decision,
        actorId: session.user.id,
        notes: decision === 'REJECTED' ? `Ditolak: ${reason}` : 'Disetujui oleh Admin',
      })

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: decision,
        tableName: 'procurements',
        recordId: id,
        newValues: { status: decision, reason },
      })

      const title = decision === 'APPROVED' ? 'Pengadaan Disetujui' : 'Pengadaan Ditolak'
      const message =
        decision === 'APPROVED'
          ? `Pengajuan pengadaan Anda telah disetujui. Silakan lakukan proses penerimaan barang jika sudah tiba.`
          : `Pengajuan pengadaan Anda ditolak. Alasan: ${reason}`

      await sendNotificationHelper(
        tx,
        [existingProcurement.userId],
        title,
        message,
        id,
        existingProcurement.procurementCode!,
      )
    })

    revalidatePath('/dashboard/procurements')
    return {
      success: true,
      message: `Pengajuan berhasil ${decision === 'APPROVED' ? 'disetujui' : 'ditolak'}`,
    }
  } catch (error) {
    console.error('Verify error:', error)
    return { error: 'Gagal memverifikasi pengajuan.' }
  }
}

export async function deleteProcurement(id: string) {
  const session = await requireAuth({ roles: ['warehouse_staff', 'super_admin'] })

  const [existingProcurement] = await db
    .select()
    .from(procurements)
    .where(eq(procurements.id, id))
    .limit(1)

  if (!existingProcurement) return { error: 'Pengajuan tidak ditemukan.' }

  if (session.user.role === 'warehouse_staff' && existingProcurement.userId !== session.user.id) {
    return { error: 'Anda tidak memiliki akses.' }
  }

  if (existingProcurement.status !== 'PENDING') {
    return { error: 'Hanya pengajuan berstatus PENDING yang dapat dibatalkan.' }
  }

  try {
    await db.transaction(async (tx) => {
      const oldItems = await tx
        .select()
        .from(procurementConsumables)
        .where(eq(procurementConsumables.procurementId, id))
      const oldData = { ...existingProcurement, items: oldItems }

      await tx.delete(procurements).where(eq(procurements.id, id))

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'DELETE',
        tableName: 'procurements',
        recordId: id,
        oldValues: oldData,
      })
    })

    revalidatePath('/dashboard/procurements')
    return { success: true, message: 'Pengajuan berhasil dibatalkan.' }
  } catch (error) {
    console.error('Delete procurement error:', error)
    return { error: 'Gagal membatalkan pengajuan.' }
  }
}

export async function getProcurements(
  page = 1,
  limit = 10,
  query = '',
  sortCol = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc',
  statusFilter = 'all',
) {
  const session = await requireAuth({
    roles: ['warehouse_staff', 'faculty_admin', 'super_admin'],
  })

  const offset = (page - 1) * limit

  const roleCondition =
    session.user.role === 'warehouse_staff' ? eq(procurements.userId, session.user.id) : undefined

  const searchCondition = query
    ? or(
        ilike(procurements.procurementCode, `%${query}%`),
        ilike(user.name, `%${query}%`),
        ilike(procurements.description, `%${query}%`),
      )
    : undefined

  let statusCondition = undefined
  if (statusFilter && statusFilter !== 'all') {
    statusCondition = eq(
      procurements.status,
      statusFilter as NonNullable<(typeof procurements.$inferSelect)['status']>,
    )
  }

  const whereCondition = and(roleCondition, searchCondition, statusCondition)

  const sortMap: Record<string, PgColumn | SQL> = {
    code: procurements.procurementCode,
    status: procurements.status,
    createdAt: procurements.createdAt,
    requester: user.name,
    description: procurements.description,
  }

  const orderColumn = sortMap[sortCol] || procurements.createdAt
  const orderBy = sortOrder === 'desc' ? desc(orderColumn) : asc(orderColumn)

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(procurements)
    .leftJoin(user, eq(procurements.userId, user.id))
    .where(whereCondition)

  const totalItems = Number(countResult?.count || 0)

  const headers = await db
    .select({
      id: procurements.id,
      code: procurements.procurementCode,
      status: procurements.status,
      createdAt: procurements.createdAt,
      requestDate: procurements.createdAt,
      updatedAt: procurements.updatedAt,
      description: procurements.description,
      notes: procurements.notes,
      userId: procurements.userId,
      requesterName: user.name,
    })
    .from(procurements)
    .leftJoin(user, eq(procurements.userId, user.id))
    .where(whereCondition)
    .limit(limit)
    .offset(offset)
    .orderBy(orderBy)

  const procurementIds = headers.map((h) => h.id)

  type ProcurementItemDetail = {
    id: string
    procurementId: string
    consumableId: string
    quantity: string
    consumableName: string | null
    unit: string | null
    hasExpiry: boolean | null
  }

  let itemsData: ProcurementItemDetail[] = []

  if (procurementIds.length > 0) {
    itemsData = await db
      .select({
        id: procurementConsumables.id,
        procurementId: procurementConsumables.procurementId,
        consumableId: procurementConsumables.consumableId,
        quantity: procurementConsumables.quantity,
        consumableName: consumables.name,
        unit: consumables.baseUnit,
        hasExpiry: consumables.hasExpiry,
      })
      .from(procurementConsumables)
      .leftJoin(consumables, eq(procurementConsumables.consumableId, consumables.id))
      .where(inArray(procurementConsumables.procurementId, procurementIds))
  }

  const data = headers.map((header) => {
    const relatedItems = itemsData.filter((i) => i.procurementId === header.id)
    return {
      ...header,
      itemsCount: relatedItems.length,
      items: relatedItems,
      requester: {
        name: header.requesterName,
      },
    }
  })

  return { data, totalItems }
}

export async function processGoodsReceipt(data: unknown) {
  const session = await requireAuth({ roles: ['warehouse_staff'] })

  if (!session.user.warehouseId) {
    return { error: 'Anda tidak terdaftar di gudang manapun.' }
  }

  const parsed = goodsReceiptSchema.safeParse(data)
  if (!parsed.success) return { error: 'Data input tidak valid.' }

  const { procurementId, items } = parsed.data

  try {
    await db.transaction(async (tx) => {
      const [po] = await tx
        .select()
        .from(procurements)
        .where(eq(procurements.id, procurementId))
        .limit(1)

      if (!po) throw new Error('Data pengadaan tidak ditemukan')

      if (po.userId !== session.user.id) {
        throw new Error('Anda tidak memiliki akses ke data ini.')
      }

      if (po.status !== 'APPROVED') {
        throw new Error('Hanya pengadaan berstatus APPROVED yang bisa diterima.')
      }

      const logDetails = []

      for (const item of items) {
        const safeBatchNumber =
          item.batchNumber && item.batchNumber.trim() !== '' ? item.batchNumber : '-'

        logDetails.push({
          itemId: item.itemId,
          qty: item.quantity,
          condition: item.condition,
          batch: safeBatchNumber,
        })

        await tx
          .update(procurementConsumables)
          .set({
            condition: item.condition,
            batchNumber: safeBatchNumber,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          })
          .where(eq(procurementConsumables.id, item.itemId))

        if (item.condition === 'GOOD') {
          await tx
            .insert(warehouseStocks)
            .values({
              id: randomUUID(),
              warehouseId: session.user.warehouseId!,
              consumableId: item.consumableId,
              quantity: item.quantity.toString(),
              batchNumber: safeBatchNumber,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [
                warehouseStocks.warehouseId,
                warehouseStocks.consumableId,
                warehouseStocks.batchNumber,
              ],
              set: {
                quantity: sql`${warehouseStocks.quantity} + ${item.quantity}`,
                updatedAt: new Date(),
              },
            })
        }
      }

      await tx
        .update(procurements)
        .set({ status: 'COMPLETED', updatedAt: new Date() })
        .where(eq(procurements.id, procurementId))

      await tx.insert(procurementTimelines).values({
        id: randomUUID(),
        procurementId: procurementId,
        status: 'COMPLETED',
        actorId: session.user.id,
        notes: `Barang diterima (Inbound) oleh ${session.user.name}`,
      })

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'INBOUND_RECEIPT',
        tableName: 'procurements',
        recordId: procurementId,
        newValues: { items: logDetails, warehouseId: session.user.warehouseId },
      })

      const facultyAdmins = await tx
        .select({ id: user.id })
        .from(user)
        .where(eq(user.role, 'faculty_admin'))

      await sendNotificationHelper(
        tx,
        facultyAdmins.map((u: { id: string }) => u.id),
        'Penerimaan Barang Selesai',
        `Pengadaan ${po.procurementCode} telah selesai. Barang sudah diterima di gudang & stok bertambah.`,
        procurementId,
        po.procurementCode!,
      )
    })

    revalidatePath('/dashboard/procurements')
    return { success: true, message: 'Barang berhasil diterima masuk stok.' }
  } catch (error) {
    console.error('Inbound Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Gagal memproses penerimaan.'
    return { error: errorMessage }
  }
}
