'use server'

import { revalidatePath } from 'next/cache'

import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'

import { auditLogs, categories } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { categorySchema } from '@/lib/validations/category'

export async function createCategory(data: unknown) {
  const session = await requireAuth({ roles: ['super_admin'] })

  const parsed = categorySchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid' }

  const newId = randomUUID()

  try {
    await db.transaction(async (tx) => {
      await tx.insert(categories).values({
        id: newId,
        name: parsed.data.name,
      })

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'CREATE',
        tableName: 'categories',
        recordId: newId,
        newValues: parsed.data,
      })
    })

    revalidatePath('/dashboard/categories')
    return { success: true, message: 'Kategori berhasil ditambahkan' }
  } catch (error) {
    console.error('Create category error:', error)
    return { error: 'Gagal menambahkan kategori' }
  }
}

export async function updateCategory(id: string, data: unknown) {
  const session = await requireAuth({ roles: ['super_admin'] })

  const parsed = categorySchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid' }

  try {
    await db.transaction(async (tx) => {
      const [oldData] = await tx.select().from(categories).where(eq(categories.id, id)).limit(1)

      if (!oldData) throw new Error('Category not found')

      await tx
        .update(categories)
        .set({
          name: parsed.data.name,
        })
        .where(eq(categories.id, id))

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'UPDATE',
        tableName: 'categories',
        recordId: id,
        oldValues: oldData,
        newValues: parsed.data,
      })
    })

    revalidatePath('/dashboard/categories')
    return { success: true, message: 'Kategori diperbarui' }
  } catch (error) {
    console.error('Update category error:', error)
    return { error: 'Gagal memperbarui kategori' }
  }
}

export async function deleteCategory(id: string) {
  const session = await requireAuth({ roles: ['super_admin'] })

  try {
    await db.transaction(async (tx) => {
      const [oldData] = await tx.select().from(categories).where(eq(categories.id, id)).limit(1)
      if (!oldData) throw new Error('Category not found')

      await tx.delete(categories).where(eq(categories.id, id))

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'DELETE',
        tableName: 'categories',
        recordId: id,
        oldValues: oldData,
      })
    })

    revalidatePath('/dashboard/categories')
    return { success: true, message: 'Kategori dihapus' }
  } catch (error) {
    const dbError = error as { code?: string }
    if (dbError.code === '23503') {
      return {
        error: 'Gagal hapus: Kategori ini sedang digunakan oleh Barang.',
      }
    }
    console.error('Delete category error:', error)
    return { error: 'Gagal menghapus kategori' }
  }
}
