'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { brands } from '@/db/schema'
import type { BrandFormValues } from '@/lib/validations/brand'

export async function createBrand(data: BrandFormValues) {
  try {
    await db.insert(brands).values({
      id: crypto.randomUUID(),
      name: data.name,
      country: data.country || null,
    })

    revalidatePath('/dashboard/asset-models')
    return { success: 'Merek berhasil ditambahkan!' }
  } catch (error) {
    console.error('Error createBrand:', error)
    // Error constraint biasanya karena nama merek sudah ada (unique)
    return { error: 'Gagal menambahkan merek. Pastikan nama merek belum terdaftar.' }
  }
}