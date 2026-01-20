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
  if (!validated.success) return { error: 'Data tidak valid' }

  const { warehouseStockId, physicalQty, reason, consumableId, type } = validated.data

  try {
    // Ambil data stok spesifik (per batch)
    const [currentStock] = await db
      .select()
      .from(warehouseStocks)
      .where(eq(warehouseStocks.id, warehouseStockId)) // ID ini unik per batch di gudang
      .limit(1)

    if (!currentStock) return { error: 'Data batch tidak ditemukan' }

    if (session.user.warehouseId && currentStock.warehouseId !== session.user.warehouseId) {
      return { error: 'Akses ditolak ke gudang ini' }
    }

    const systemQty = Number(currentStock.quantity)
    const delta = physicalQty - systemQty

    if (delta === 0) {
      return { success: true, message: 'Jumlah sesuai, tidak ada perubahan.' }
    }

    await db.transaction(async (tx) => {
      // 1. Catat Adjustment History
      await tx.insert(consumableAdjustments).values({
        id: randomUUID(),
        userId: session.user.id,
        consumableId: consumableId,
        warehouseId: currentStock.warehouseId,
        batchNumber: currentStock.batchNumber,
        deltaQuantity: String(delta),
        type: type, // Menggunakan tipe yang dipilih user
        reason: reason,
      })

      // 2. Update Stok Gudang
      await tx
        .update(warehouseStocks)
        .set({
          quantity: String(physicalQty),
          updatedAt: new Date(),
        })
        .where(eq(warehouseStocks.id, warehouseStockId))

      // 3. Audit Log
      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: type, // Gunakan tipe sebagai action name agar jelas
        tableName: 'warehouse_stocks',
        recordId: warehouseStockId,
        oldValues: { quantity: systemQty, batch: currentStock.batchNumber },
        newValues: { quantity: physicalQty, type, reason, delta },
      })
    })

    revalidatePath('/dashboard/stock-opname')
    return { success: true, message: 'Stok berhasil diperbarui' }
  } catch (error) {
    console.error('Stock Opname Error:', error)
    return { error: 'Gagal menyimpan perubahan' }
  }
}
