'use server'

import { db } from '@/lib/db'
import { 
  assetDistributions, 
  assetDistributionTargets, 
  fixedAssets 
} from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'

// 1. SIMPAN DRAFT DISTRIBUSI (Matriks Alokasi Gudang)
export async function createDistributionDraft(data: {
  actorId: string
  modelId: string
  totalQuantity: number
  notes?: string
  targets: { roomId: string; allocatedQuantity: number }[]
}) {
  try {
    return await db.transaction(async (tx) => {
      const sumAllocated = data.targets.reduce((sum, t) => sum + t.allocatedQuantity, 0)
      if (sumAllocated !== data.totalQuantity) {
        throw new Error('Jumlah alokasi ruangan tidak sama dengan total barang.')
      }

      const distCode = `DROP-${Date.now().toString().slice(-6)}`

      const [distribution] = await tx
        .insert(assetDistributions)
        .values({
          id: crypto.randomUUID(), // <--- TAMBAHAN: Generate ID otomatis
          distributionCode: distCode,
          actorId: data.actorId,
          modelId: data.modelId,
          totalQuantity: data.totalQuantity,
          notes: data.notes,
          status: 'DRAFT',
        })
        .returning()

      const targetValues = data.targets.map((t) => ({
        id: crypto.randomUUID(), // <--- TAMBAHAN: Generate ID otomatis
        distributionId: distribution.id,
        targetRoomId: t.roomId,
        allocatedQuantity: t.allocatedQuantity,
        receivedQuantity: 0,
      }))

      await tx.insert(assetDistributionTargets).values(targetValues)

      revalidatePath('/dashboard/distributions')
      return { success: true, message: 'Draft Distribusi berhasil disimpan!' }
    })
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

// 2. EKSEKUSI DISTRIBUSI (Generate Fisik & QR Code -> OTW ke Ruangan)
export async function executeDistribution(distributionId: string) {
  try {
    return await db.transaction(async (tx) => {
      const distribution = await tx.query.assetDistributions.findFirst({
        where: eq(assetDistributions.id, distributionId),
        with: { targets: true },
      })

      if (!distribution || distribution.status !== 'DRAFT') {
        throw new Error('Distribusi tidak valid.')
      }

      const newAssetsToInsert = []

      // Generate barang fisik (fixedAssets) sesuai jumlah alokasi tiap ruangan
      for (const target of distribution.targets) {
        for (let i = 0; i < target.allocatedQuantity; i++) {
          const uniqueString = crypto.randomBytes(4).toString('hex').toUpperCase()
          
          newAssetsToInsert.push({
            id: crypto.randomUUID(), // <--- TAMBAHAN: Generate ID otomatis untuk aset fisik
            modelId: distribution.modelId,
            roomId: target.targetRoomId, 
            isMovable: true, 
            movementStatus: 'IN_TRANSIT',
            condition: 'GOOD',
            qrToken: `QR-${distribution.modelId.slice(0,3).toUpperCase()}-${uniqueString}`,
            notes: `Dropping dari: ${distribution.distributionCode}`,
          })
        }
      }

      if (newAssetsToInsert.length > 0) {
        await tx.insert(fixedAssets).values(newAssetsToInsert)
      }

      // Ubah status dropping menjadi SHIPPED (Dikirim)
      await tx
        .update(assetDistributions)
        .set({ status: 'SHIPPED' })
        .where(eq(assetDistributions.id, distributionId))

      revalidatePath('/dashboard/distributions')
      return { success: true, message: 'Barang berhasil didistribusikan!' }
    })
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

// 3. HANDSHAKE (Laboran Konfirmasi Terima Fisik Barang)
export async function receiveDistributionHandshake({
  targetId,
  receivedQty,
  roomId,
  receiverId,
}: {
  targetId: string
  receivedQty: number
  roomId: string
  receiverId: string
}) {
  try {
    return await db.transaction(async (tx) => {
      const target = await tx.query.assetDistributionTargets.findFirst({
        where: eq(assetDistributionTargets.id, targetId),
        with: { distribution: true },
      })

      if (!target) throw new Error('Data target tidak ditemukan.')
      
      const pendingQty = target.allocatedQuantity - target.receivedQuantity
      if (receivedQty > pendingQty) {
        throw new Error(`Jumlah melampaui sisa barang yang dikirim (${pendingQty}).`)
      }

      // Cari barang OTW milik ruangan ini
      const incomingAssets = await tx.query.fixedAssets.findMany({
        where: and(
          eq(fixedAssets.roomId, roomId),
          eq(fixedAssets.modelId, target.distribution.modelId),
          eq(fixedAssets.movementStatus, 'IN_TRANSIT')
        ),
        limit: receivedQty, 
      })

      if (incomingAssets.length < receivedQty) throw new Error('Aset IN_TRANSIT tidak cukup.')

      const assetIdsToUpdate = incomingAssets.map((asset) => asset.id)

      // Ubah status fisik barang menjadi IN_STORE
      await tx
        .update(fixedAssets)
        .set({ movementStatus: 'IN_STORE' })
        .where(inArray(fixedAssets.id, assetIdsToUpdate))

      // Update counter penerimaan di tabel Distribusi
      await tx
        .update(assetDistributionTargets)
        .set({
          receivedQuantity: target.receivedQuantity + receivedQty,
          receiverId: receiverId,
          receivedAt: new Date(),
        })
        .where(eq(assetDistributionTargets.id, targetId))

      revalidatePath('/dashboard/incoming-distributions')
      return { success: true, message: `Berhasil menerima ${receivedQty} unit barang.` }
    })
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}