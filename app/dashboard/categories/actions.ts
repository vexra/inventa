'use server'

import { revalidatePath } from 'next/cache'

import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'

import { categories } from '@/db/schema'
import { db } from '@/lib/db'
import { categorySchema } from '@/lib/validations/category'

export async function createCategory(data: unknown) {
  const parsed = categorySchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid' }

  try {
    await db.insert(categories).values({
      id: randomUUID(),
      name: parsed.data.name,
    })
    revalidatePath('/dashboard/categories')
    return { success: true, message: 'Kategori berhasil ditambahkan' }
  } catch (error) {
    return { error: 'Gagal menambahkan kategori' }
  }
}

export async function updateCategory(id: string, data: unknown) {
  const parsed = categorySchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid' }

  try {
    await db
      .update(categories)
      .set({
        name: parsed.data.name,
      })
      .where(eq(categories.id, id))

    revalidatePath('/dashboard/categories')
    return { success: true, message: 'Kategori diperbarui' }
  } catch (error) {
    return { error: 'Gagal memperbarui kategori' }
  }
}

export async function deleteCategory(id: string) {
  try {
    await db.delete(categories).where(eq(categories.id, id))
    revalidatePath('/dashboard/categories')
    return { success: true, message: 'Kategori dihapus' }
  } catch (error) {
    return { error: 'Gagal menghapus kategori (mungkin sedang digunakan oleh barang)' }
  }
}
