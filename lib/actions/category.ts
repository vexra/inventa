'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { categories } from '@/db/schema'

// Asumsi Anda sudah punya categorySchema di lib/validations/category.ts
// Jika belum, parameter data bisa menggunakan tipe { name: string }
export async function createCategory(data: { name: string }) {
  try {
    await db.insert(categories).values({
      id: crypto.randomUUID(),
      name: data.name,
    })

    // Refresh halaman yang menampilkan kategori
    revalidatePath('/dashboard/categories')
    revalidatePath('/dashboard/asset-models') 
    
    return { success: 'Kategori berhasil ditambahkan!' }
  } catch (error) {
    console.error('Error createCategory:', error)
    return { error: 'Gagal menambahkan kategori.' }
  }
}