'use server'

import { revalidatePath } from 'next/cache'

import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'

import { auditLogs, buildings, faculties } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { buildingSchema } from '@/lib/validations/building'

// --- 1. CREATE BUILDING ---
export async function createBuilding(data: unknown) {
  // Hanya Super Admin & Faculty Admin yang boleh
  const session = await requireAuth({
    roles: ['super_admin', 'faculty_admin'],
  })

  const parsed = buildingSchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid' }

  // [SECURITY CHECK] Jika Faculty Admin, pastikan dia hanya membuat gedung di fakultasnya sendiri
  if (session.user.role === 'faculty_admin' && session.user.facultyId !== parsed.data.facultyId) {
    return { error: 'Anda tidak berhak menambahkan gedung di fakultas lain' }
  }

  const newId = `bld-${randomUUID()}`

  try {
    await db.transaction(async (tx) => {
      await tx.insert(buildings).values({
        id: newId,
        facultyId: parsed.data.facultyId,
        name: parsed.data.name,
        code: parsed.data.code || null,
        description: parsed.data.description || null,
      })

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'CREATE',
        tableName: 'buildings',
        recordId: newId,
        newValues: parsed.data,
      })
    })

    revalidatePath('/dashboard/buildings')
    return { success: true, message: 'Gedung berhasil ditambahkan' }
  } catch (error) {
    console.error('Create building error:', error)
    return { error: 'Gagal menambahkan gedung' }
  }
}

// --- 2. UPDATE BUILDING ---
export async function updateBuilding(id: string, data: unknown) {
  const session = await requireAuth({
    roles: ['super_admin', 'faculty_admin'],
  })

  const parsed = buildingSchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid' }

  try {
    await db.transaction(async (tx) => {
      // Ambil data lama untuk cek kepemilikan
      const [oldData] = await tx.select().from(buildings).where(eq(buildings.id, id)).limit(1)
      if (!oldData) throw new Error('Building not found')

      // [SECURITY CHECK] Faculty Admin hanya boleh edit gedung miliknya
      if (session.user.role === 'faculty_admin' && session.user.facultyId !== oldData.facultyId) {
        throw new Error('Unauthorized access to this building')
      }

      await tx
        .update(buildings)
        .set({
          facultyId: parsed.data.facultyId, // Bisa pindah fakultas (hanya super_admin yg bisa lewat UI nanti)
          name: parsed.data.name,
          code: parsed.data.code || null,
          description: parsed.data.description || null,
        })
        .where(eq(buildings.id, id))

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'UPDATE',
        tableName: 'buildings',
        recordId: id,
        oldValues: oldData,
        newValues: parsed.data,
      })
    })

    revalidatePath('/dashboard/buildings')
    return { success: true, message: 'Data gedung diperbarui' }
  } catch (error) {
    console.error('Update building error:', error)
    return { error: 'Gagal memperbarui gedung' }
  }
}

// --- 3. DELETE BUILDING ---
export async function deleteBuilding(id: string) {
  const session = await requireAuth({
    roles: ['super_admin', 'faculty_admin'],
  })

  try {
    await db.transaction(async (tx) => {
      const [oldData] = await tx.select().from(buildings).where(eq(buildings.id, id)).limit(1)
      if (!oldData) throw new Error('Building not found')

      // [SECURITY CHECK]
      if (session.user.role === 'faculty_admin' && session.user.facultyId !== oldData.facultyId) {
        throw new Error('Unauthorized access')
      }

      await tx.delete(buildings).where(eq(buildings.id, id))

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'DELETE',
        tableName: 'buildings',
        recordId: id,
        oldValues: oldData,
      })
    })

    revalidatePath('/dashboard/buildings')
    return { success: true, message: 'Gedung dihapus' }
  } catch (error) {
    const dbError = error as { code?: string }
    // Cek Foreign Key (Jika gedung masih punya ruangan)
    if (dbError.code === '23503') {
      return { error: 'Gagal hapus: Gedung ini masih memiliki Ruangan aktif.' }
    }
    return { error: 'Gagal menghapus gedung' }
  }
}

// --- HELPER: GET FACULTIES (Untuk Dropdown Form) ---
export async function getFacultiesOption() {
  const data = await db.select({ id: faculties.id, name: faculties.name }).from(faculties)
  return data
}
