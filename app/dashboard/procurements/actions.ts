'use server'

import { revalidatePath } from 'next/cache'

import { randomUUID } from 'crypto'
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import { z } from 'zod'

import {
  auditLogs,
  consumables,
  procurementConsumables,
  procurementTimelines,
  procurements,
  user,
  warehouseStocks,
} from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { goodsReceiptSchema } from '@/lib/validations/inbound'

const itemSchema = z.object({
  consumableId: z.string().min(1, 'Pilih barang'),
  quantity: z.coerce.number().min(1, 'Minimal 1'),
  description: z.string().optional(),
})

const procurementSchema = z.object({
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Minimal satu barang harus dipilih'),
})

export async function createProcurement(data: z.infer<typeof procurementSchema>) {
  const session = await requireAuth({ roles: ['warehouse_staff'] })

  if (!session.user.warehouseId) {
    return { error: 'Anda tidak terdaftar di gudang manapun.' }
  }

  const parsed = procurementSchema.safeParse(data)
  if (!parsed.success) {
    return { error: 'Data tidak valid.' }
  }

  const procurementId = randomUUID()
  const code = `PO/${new Date().getFullYear()}/${Math.floor(Math.random() * 10000)}`

  try {
    await db.transaction(async (tx) => {
      await tx.insert(procurements).values({
        id: procurementId,
        procurementCode: code,
        userId: session.user.id,
        status: 'PENDING',
        notes: parsed.data.notes,
      })

      const itemsToInsert = parsed.data.items.map((item) => ({
        id: randomUUID(),
        procurementId: procurementId,
        consumableId: item.consumableId,
        warehouseId: session.user.warehouseId,
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
    })

    revalidatePath('/dashboard/procurements')
    return { success: true }
  } catch (error) {
    console.error('Create procurement error:', error)
    return { error: 'Gagal membuat pengajuan.' }
  }
}

export async function updateProcurement(id: string, data: z.infer<typeof procurementSchema>) {
  const session = await requireAuth({ roles: ['warehouse_staff'] })

  if (!session.user.warehouseId) {
    return { error: 'Anda tidak terdaftar di gudang manapun.' }
  }

  const [existingProcurement] = await db
    .select()
    .from(procurements)
    .where(eq(procurements.id, id))
    .limit(1)

  if (!existingProcurement) return { error: 'Pengajuan tidak ditemukan.' }
  if (existingProcurement.userId !== session.user.id) return { error: 'Anda tidak memiliki akses.' }
  if (existingProcurement.status !== 'PENDING')
    return { error: 'Pengajuan yang sudah diproses tidak dapat diedit.' }

  const parsed = procurementSchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid.' }

  try {
    await db.transaction(async (tx) => {
      const [oldHeader] = await tx
        .select()
        .from(procurements)
        .where(eq(procurements.id, id))
        .limit(1)
      const oldItems = await tx
        .select()
        .from(procurementConsumables)
        .where(eq(procurementConsumables.procurementId, id))
      const oldData = { ...oldHeader, items: oldItems }

      await tx.update(procurements).set({ notes: parsed.data.notes }).where(eq(procurements.id, id))
      await tx.delete(procurementConsumables).where(eq(procurementConsumables.procurementId, id))

      const itemsToInsert = parsed.data.items.map((item) => ({
        id: randomUUID(),
        procurementId: id,
        consumableId: item.consumableId,
        warehouseId: session.user.warehouseId,
        quantity: item.quantity.toString(),
      }))

      await tx.insert(procurementConsumables).values(itemsToInsert)

      await tx.insert(procurementTimelines).values({
        id: randomUUID(),
        procurementId: id,
        status: 'PENDING',
        actorId: session.user.id,
        notes: 'Pengajuan diedit (Revisi Draft)',
      })

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'UPDATE',
        tableName: 'procurements',
        recordId: id,
        oldValues: oldData,
        newValues: parsed.data,
      })
    })

    revalidatePath('/dashboard/procurements')
    return { success: true }
  } catch (error) {
    console.error('Update procurement error:', error)
    return { error: 'Gagal mengupdate pengajuan.' }
  }
}

export async function deleteProcurement(id: string) {
  const session = await requireAuth({ roles: ['warehouse_staff'] })

  const [existingProcurement] = await db
    .select()
    .from(procurements)
    .where(eq(procurements.id, id))
    .limit(1)

  if (!existingProcurement) return { error: 'Pengajuan tidak ditemukan.' }
  if (existingProcurement.userId !== session.user.id) return { error: 'Anda tidak memiliki akses.' }
  if (existingProcurement.status !== 'PENDING')
    return { error: 'Hanya pengajuan berstatus PENDING yang dapat dibatalkan.' }

  try {
    await db.transaction(async (tx) => {
      const [oldHeader] = await tx
        .select()
        .from(procurements)
        .where(eq(procurements.id, id))
        .limit(1)
      const oldItems = await tx
        .select()
        .from(procurementConsumables)
        .where(eq(procurementConsumables.procurementId, id))
      const oldData = { ...oldHeader, items: oldItems }

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

export async function getProcurements(page = 1, limit = 10, query = '') {
  const session = await requireAuth({ roles: ['warehouse_staff'] })
  const offset = (page - 1) * limit

  // 1. Base Condition (Filter Role)
  const roleCondition =
    session.user.role === 'warehouse_staff' ? eq(procurements.userId, session.user.id) : undefined

  // 2. Search Condition (Filter Pencarian)
  const searchCondition = query
    ? or(ilike(procurements.procurementCode, `%${query}%`), ilike(user.name, `%${query}%`))
    : undefined

  const whereCondition =
    roleCondition && searchCondition
      ? and(roleCondition, searchCondition)
      : searchCondition || roleCondition

  // 3. Hitung Total Data
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(procurements)
    .leftJoin(user, eq(procurements.userId, user.id))
    .where(whereCondition)

  const totalItems = Number(countResult?.count || 0)

  // 4. Ambil Data Halaman Ini
  const headers = await db
    .select({
      id: procurements.id,
      code: procurements.procurementCode,
      status: procurements.status,
      requestDate: procurements.createdAt,
      updatedAt: procurements.updatedAt,
      notes: procurements.notes,
      userId: procurements.userId,
      requesterName: user.name,
    })
    .from(procurements)
    .leftJoin(user, eq(procurements.userId, user.id))
    .where(whereCondition)
    .limit(limit)
    .offset(offset)
    .orderBy(desc(procurements.createdAt))

  const procurementIds = headers.map((h) => h.id)

  type ProcurementItemDetail = {
    id: string
    procurementId: string
    consumableId: string
    quantity: string
    consumableName: string | null
    unit: string | null
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
      })
      .from(procurementConsumables)
      .leftJoin(consumables, eq(procurementConsumables.consumableId, consumables.id))
      .where(inArray(procurementConsumables.procurementId, procurementIds))
  }

  const data = headers.map((header) => {
    const relatedItems = itemsData.filter((i) => i.procurementId === header.id)
    return {
      ...header,
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
        logDetails.push({
          itemId: item.itemId,
          qty: item.quantity,
          condition: item.condition,
          batch: item.batchNumber,
        })

        await tx
          .update(procurementConsumables)
          .set({
            condition: item.condition,
            batchNumber: item.batchNumber,
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
              batchNumber: item.batchNumber,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [warehouseStocks.warehouseId, warehouseStocks.consumableId],
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
    })

    revalidatePath('/dashboard/procurements')
    return { success: true, message: 'Barang berhasil diterima masuk stok.' }
  } catch (error) {
    console.error('Inbound Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Gagal memproses penerimaan.'
    return { error: errorMessage }
  }
}
