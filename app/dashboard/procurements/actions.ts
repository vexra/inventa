'use server'

import { revalidatePath } from 'next/cache'

import { randomUUID } from 'crypto'
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import { z } from 'zod'

import {
  auditLogs,
  procurementConsumables,
  procurementTimelines,
  procurements,
  user,
} from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

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
  const session = await requireAuth({ roles: ['warehouse_staff', 'super_admin'] })

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
  const session = await requireAuth({ roles: ['warehouse_staff', 'super_admin'] })

  if (!session.user.warehouseId) {
    return { error: 'Anda tidak terdaftar di gudang manapun.' }
  }

  const [existingProcurement] = await db
    .select()
    .from(procurements)
    .where(eq(procurements.id, id))
    .limit(1)

  if (!existingProcurement) {
    return { error: 'Pengajuan tidak ditemukan.' }
  }

  if (session.user.role !== 'super_admin' && existingProcurement.userId !== session.user.id) {
    return { error: 'Anda tidak memiliki akses.' }
  }

  if (existingProcurement.status !== 'PENDING') {
    return { error: 'Pengajuan yang sudah diproses tidak dapat diedit.' }
  }

  const parsed = procurementSchema.safeParse(data)
  if (!parsed.success) {
    return { error: 'Data tidak valid.' }
  }

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
  const session = await requireAuth({ roles: ['warehouse_staff', 'super_admin'] })

  const [existingProcurement] = await db
    .select()
    .from(procurements)
    .where(eq(procurements.id, id))
    .limit(1)

  if (!existingProcurement) {
    return { error: 'Pengajuan tidak ditemukan.' }
  }

  if (session.user.role !== 'super_admin' && existingProcurement.userId !== session.user.id) {
    return { error: 'Anda tidak memiliki akses.' }
  }

  if (existingProcurement.status !== 'PENDING') {
    return { error: 'Hanya pengajuan berstatus PENDING yang dapat dibatalkan.' }
  }

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
  const session = await requireAuth({ roles: ['warehouse_staff', 'super_admin'] })
  const offset = (page - 1) * limit

  // 1. Base Condition (Filter Role)
  const roleCondition =
    session.user.role === 'warehouse_staff' ? eq(procurements.userId, session.user.id) : undefined

  // 2. Search Condition (Filter Pencarian)
  const searchCondition = query
    ? or(
        ilike(procurements.procurementCode, `%${query}%`), // Cari Kode PO
        ilike(user.name, `%${query}%`), // Cari Nama Requester
      )
    : undefined

  // Gabungkan kondisi (AND)
  const whereCondition =
    roleCondition && searchCondition
      ? and(roleCondition, searchCondition)
      : searchCondition || roleCondition

  // 3. Hitung Total Data (Untuk Pagination)
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(procurements)
    .leftJoin(user, eq(procurements.userId, user.id)) // Join user karena kita cari nama user juga
    .where(whereCondition)

  const totalItems = Number(countResult?.count || 0)

  // 4. Ambil Data Halaman Ini
  const headers = await db
    .select({
      id: procurements.id,
      code: procurements.procurementCode,
      status: procurements.status,
      requestDate: procurements.createdAt,
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
  let itemsData: any[] = []

  // Fetch Items hanya untuk procurement yang tampil
  if (procurementIds.length > 0) {
    itemsData = await db
      .select()
      .from(procurementConsumables)
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
