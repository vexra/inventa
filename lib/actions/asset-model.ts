'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { assetModels } from '@/db/schema'
import type { AssetModelFormValues } from '@/lib/validations/asset'

export async function createAssetModel(data: AssetModelFormValues) {
  try {
    await db.insert(assetModels).values({
      id: crypto.randomUUID(),
      categoryId: data.categoryId,
      brandId: data.brandId,
      name: data.name,
      modelNumber: data.modelNumber || null,
      isMovable: data.isMovable ?? false,
      specifications: data.specifications || null, // Format JSON aman dimasukkan langsung
      description: data.description || null,
    })

    revalidatePath('/dashboard/asset-models')
    revalidatePath('/dashboard/fixed-assets') // Refresh juga halaman aset fisik
    return { success: 'Katalog Model Aset berhasil ditambahkan!' }
  } catch (error) {
    console.error('Error createAssetModel:', error)
    return { error: 'Gagal menambahkan model aset.' }
  }
}