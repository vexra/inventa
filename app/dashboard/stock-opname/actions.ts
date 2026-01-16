'use server'

import { revalidatePath } from 'next/cache'

import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { auditLogs, consumableAdjustments, warehouseStocks } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { stockOpnameSchema } from '@/lib/validations/stock-opname'

export async function submitStockOpname(values: z.infer<typeof stockOpnameSchema>) {
  const session = await requireAuth({ roles: ['warehouse_staff'] })

  const validated = stockOpnameSchema.safeParse(values)

  if (!validated.success) {
    return { error: 'Data tidak valid' }
  }

  const { warehouseStockId, physicalQty, reason, consumableId } = validated.data

  try {
    const [currentStock] = await db
      .select()
      .from(warehouseStocks)
      .where(eq(warehouseStocks.id, warehouseStockId))
      .limit(1)

    if (!currentStock) {
      return { error: 'Data stok tidak ditemukan' }
    }

    if (session.user.warehouseId && currentStock.warehouseId !== session.user.warehouseId) {
      return { error: 'Anda tidak memiliki akses ke gudang ini' }
    }

    const systemQty = Number(currentStock.quantity)
    const delta = physicalQty - systemQty

    if (delta === 0) {
      return { success: true, message: 'Jumlah fisik sesuai dengan sistem. Tidak ada perubahan.' }
    }

    await db.transaction(async (tx) => {
      await tx.insert(consumableAdjustments).values({
        id: randomUUID(),
        userId: session.user.id,
        consumableId: consumableId,
        warehouseId: currentStock.warehouseId,
        batchNumber: currentStock.batchNumber,
        deltaQuantity: String(delta),
        type: 'STOCK_OPNAME',
        reason: reason,
      })

      await tx
        .update(warehouseStocks)
        .set({
          quantity: String(physicalQty),
          updatedAt: new Date(),
        })
        .where(eq(warehouseStocks.id, warehouseStockId))

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'STOCK_OPNAME',
        tableName: 'warehouse_stocks',
        recordId: warehouseStockId,
        oldValues: {
          quantity: systemQty,
          batchNumber: currentStock.batchNumber,
        },
        newValues: {
          quantity: physicalQty,
          reason: reason,
          delta: delta,
        },
      })
    })

    revalidatePath('/dashboard/stock-opname')
    return { success: true, message: 'Stock opname berhasil disimpan' }
  } catch (error) {
    console.error('Stock Opname Error:', error)
    return { error: 'Gagal menyimpan data stock opname' }
  }
}
