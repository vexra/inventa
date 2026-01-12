'use server'

import { revalidatePath } from 'next/cache'

import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'

import { auditLogs, rooms } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { roomSchema } from '@/lib/validations/room'

export async function createRoom(data: unknown) {
  const session = await requireAuth({
    roles: ['super_admin', 'unit_admin'],
  })

  const parsed = roomSchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid' }

  const newId = randomUUID()
  const qrToken = `ROOM-${randomUUID().split('-')[0]}-${Date.now()}`

  try {
    await db.transaction(async (tx) => {
      await tx.insert(rooms).values({
        id: newId,
        unitId: parsed.data.unitId,
        name: parsed.data.name,
        type: parsed.data.type,
        qrToken: qrToken,
        description: parsed.data.description || null,
      })

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'CREATE',
        tableName: 'rooms',
        recordId: newId,
        newValues: parsed.data,
      })
    })

    revalidatePath('/dashboard/rooms')
    return { success: true, message: 'Ruangan berhasil dibuat' }
  } catch (error) {
    console.error('Create room error:', error)
    return { error: 'Gagal membuat ruangan' }
  }
}

export async function updateRoom(id: string, data: unknown) {
  const session = await requireAuth({
    roles: ['super_admin', 'unit_admin'],
  })

  const parsed = roomSchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid' }

  try {
    await db.transaction(async (tx) => {
      const [oldData] = await tx.select().from(rooms).where(eq(rooms.id, id)).limit(1)

      if (!oldData) throw new Error('Room not found')

      await tx
        .update(rooms)
        .set({
          name: parsed.data.name,
          unitId: parsed.data.unitId,
          type: parsed.data.type,
          description: parsed.data.description || null,
        })
        .where(eq(rooms.id, id))

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'UPDATE',
        tableName: 'rooms',
        recordId: id,
        oldValues: oldData,
        newValues: parsed.data,
      })
    })

    revalidatePath('/dashboard/rooms')
    return { success: true, message: 'Data ruangan diperbarui' }
  } catch (error) {
    console.error('Update room error:', error)
    return { error: 'Gagal memperbarui ruangan' }
  }
}

export async function deleteRoom(id: string) {
  const session = await requireAuth({
    roles: ['super_admin', 'unit_admin'],
  })

  try {
    await db.transaction(async (tx) => {
      const [oldData] = await tx.select().from(rooms).where(eq(rooms.id, id)).limit(1)

      if (!oldData) throw new Error('Room not found')

      await tx.delete(rooms).where(eq(rooms.id, id))

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'DELETE',
        tableName: 'rooms',
        recordId: id,
        oldValues: oldData,
      })
    })

    revalidatePath('/dashboard/rooms')
    return { success: true, message: 'Ruangan dihapus' }
  } catch (error) {
    const dbError = error as { code?: string }

    if (dbError.code === '23503') {
      return { error: 'Gagal: Ruangan ini masih memiliki Aset atau Data Stok.' }
    }
    return { error: 'Gagal menghapus ruangan' }
  }
}
