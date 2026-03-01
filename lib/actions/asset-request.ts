'use server'

import { db } from '@/lib/db'
import { requests, requestAssetItems } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

// 1. BUAT PENGAJUAN ASET BARU (Oleh Laboran / Kajur)
export async function createAssetRequest(data: {
  requesterId: string
  roomId: string
  description: string
  items: { modelId: string; qtyRequested: number }[]
}) {
  try {
    return await db.transaction(async (tx) => {
      // Generate Kode Request (Contoh: REQ-AST-123456)
      const requestCode = `REQ-AST-${Date.now().toString().slice(-6)}`

      // 1. Simpan Header ke tabel `requests` dengan type 'ASSET'
      const [newRequest] = await tx
        .insert(requests)
        .values({
          requestCode,
          type: 'ASSET', // <--- PENTING: Penanda ini adalah pengajuan aset
          requesterId: data.requesterId,
          roomId: data.roomId,
          description: data.description,
          status: 'PENDING_UNIT', // Menunggu ACC Kajur
        })
        .returning()

      // 2. Simpan Detail Item ke tabel `request_asset_items`
      const itemsToInsert = data.items.map((item) => ({
        requestId: newRequest.id,
        modelId: item.modelId,
        qtyRequested: item.qtyRequested,
      }))

      await tx.insert(requestAssetItems).values(itemsToInsert)

      revalidatePath('/dashboard/asset-requests')
      return { success: true, message: 'Pengajuan aset berhasil dibuat!' }
    })
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

// 2. PERSETUJUAN KAJUR (Unit Admin)
export async function approveAssetRequestByUnit(requestId: string, unitAdminId: string) {
  try {
    await db
      .update(requests)
      .set({
        status: 'PENDING_FACULTY', // Lanjut ke Fakultas
        approvedByUnitId: unitAdminId,
      })
      .where(eq(requests.id, requestId))

    revalidatePath('/dashboard/asset-requests')
    return { success: true, message: 'Pengajuan disetujui, diteruskan ke Fakultas.' }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

// 3. PERSETUJUAN FAKULTAS (Faculty Admin)
export async function approveAssetRequestByFaculty(requestId: string, facultyAdminId: string) {
  try {
    await db
      .update(requests)
      .set({
        status: 'APPROVED', // Disetujui sepenuhnya (Bisa lanjut ke proses pengadaan/pembelian)
        approvedByFacultyId: facultyAdminId,
      })
      .where(eq(requests.id, requestId))

    revalidatePath('/dashboard/asset-requests')
    return { success: true, message: 'Pengajuan disetujui oleh Fakultas.' }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}