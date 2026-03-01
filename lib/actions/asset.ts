'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { fixedAssets } from '@/db/schema'
import { auth } from '@/lib/auth'
import type { FixedAssetFormValues } from '@/lib/validations/asset'

export async function createFixedAsset(data: FixedAssetFormValues) {
  try {
    // 1. Verifikasi User
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session) {
      return { error: 'Anda harus login untuk melakukan aksi ini' }
    }

    // 2. Logika Generate QR Code Otomatis
    const year = new Date().getFullYear()
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase()
    const generatedQrToken = `AST-${year}-${randomStr}`

    // 3. Simpan ke Database
    await db.insert(fixedAssets).values({
      id: crypto.randomUUID(), // <-- FIX: Generate ID unik di sini
      modelId: data.modelId,
      roomId: data.roomId || null,
      warehouseId: data.warehouseId || null,
      inventoryNumber: data.inventoryNumber,
      qrToken: generatedQrToken,
      isMovable: data.isMovable,
      condition: data.condition as 'GOOD' | 'MINOR_DAMAGE' | 'MAJOR_DAMAGE' | 'BROKEN' | 'LOST' | 'MAINTENANCE',
      procurementYear: data.procurementYear || null,
      price: data.price ? data.price.toString() : null,
      purchaseDate: data.purchaseDate || null,
      notes: data.notes || null,
    })

    // 4. Refresh halaman
    revalidatePath('/dashboard/fixed-assets')

    return { success: 'Aset berhasil ditambahkan beserta QR Codenya!' }
  } catch (error) {
    console.error('Error createFixedAsset:', error)
    return { error: 'Gagal menambahkan data aset. Pastikan Nomor Inventaris tidak kembar.' }
  }
}