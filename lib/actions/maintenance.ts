'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { assetMaintenances } from '@/db/schema'
import { auth } from '@/lib/auth'
import type { AssetMaintenanceFormValues } from '@/lib/validations/maintenance'

// Fungsi untuk melaporkan kerusakan aset langsung dari tabel
export async function reportAssetDamage(
  assetId: string,
  severity: 'MINOR' | 'MODERATE' | 'MAJOR',
  description: string
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return { success: false, message: 'Sesi tidak valid' }
    }

    await db.insert(assetMaintenances).values({
      id: crypto.randomUUID(),
      assetId,
      reporterId: session.user.id,
      severity,
      status: 'REPORTED',
      description,
      downtimeStart: new Date(),
    })

    revalidatePath('/dashboard/room-assets')
    revalidatePath('/dashboard/unit-assets')
    revalidatePath('/dashboard/maintenances')

    return { success: true, message: 'Laporan kerusakan berhasil dikirim!' }
  } catch (error) {
    console.error('Error reporting asset damage:', error)
    return { success: false, message: 'Terjadi kesalahan saat mengirim laporan.' }
  }
}

export async function createMaintenanceReport(data: AssetMaintenanceFormValues) {
  try {
    // 1. Ambil data user yang sedang login (sebagai Pelapor / Reporter)
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return { error: 'Sesi tidak valid' }
    }

    // 2. Simpan laporan ke database
    await db.insert(assetMaintenances).values({
      id: crypto.randomUUID(),
      assetId: data.assetId,
      reporterId: session.user.id, // <-- Otomatis terisi ID user yang login
      severity: data.severity as 'MINOR' | 'MODERATE' | 'MAJOR',
      status: data.status as 'REPORTED' | 'IN_PROGRESS' | 'COMPLETED' | 'IRREPARABLE',
      description: data.description,
      repairCost: data.repairCost ? data.repairCost.toString() : null,
      downtimeStart: data.downtimeStart,
    })

    revalidatePath('/dashboard/fixed-assets')
    revalidatePath('/dashboard/maintenances')
    return { success: 'Laporan kerusakan berhasil dikirim!' }
  } catch (error) {
    console.error('Error createMaintenanceReport:', error)
    return { error: 'Terjadi kesalahan saat menyimpan laporan.' }
  }
}