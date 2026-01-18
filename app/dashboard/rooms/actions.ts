'use server'

import { revalidatePath } from 'next/cache'

import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'

import { auditLogs, rooms, units } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { roomSchema } from '@/lib/validations/room'

type User = {
  id: string
  role?: string | null
  unitId?: string | null
  facultyId?: string | null
}

async function validateRoomPermission(user: User, targetUnitId: string) {
  if (user.role === 'super_admin') return true

  if (user.role === 'unit_admin') {
    return user.unitId === targetUnitId
  }

  if (user.role === 'faculty_admin') {
    const [targetUnit] = await db
      .select({ facultyId: units.facultyId })
      .from(units)
      .where(eq(units.id, targetUnitId))
      .limit(1)

    return targetUnit?.facultyId === user.facultyId
  }

  return false
}

export async function createRoom(data: unknown) {
  const session = await requireAuth({
    roles: ['super_admin', 'unit_admin', 'faculty_admin'],
  })

  const parsed = roomSchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid' }

  const canCreate = await validateRoomPermission(session.user, parsed.data.unitId)

  if (!canCreate) {
    return { error: 'Anda tidak memiliki izin membuat ruangan di unit ini.' }
  }

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
    roles: ['super_admin', 'unit_admin', 'faculty_admin'],
  })

  const parsed = roomSchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid' }

  try {
    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({
          room: rooms,
          unit: units,
        })
        .from(rooms)
        .leftJoin(units, eq(rooms.unitId, units.id))
        .where(eq(rooms.id, id))
        .limit(1)

      if (!existing) throw new Error('Room not found')

      let hasAccess = false
      if (session.user.role === 'super_admin') hasAccess = true
      else if (session.user.role === 'unit_admin')
        hasAccess = existing.room.unitId === session.user.unitId
      else if (session.user.role === 'faculty_admin')
        hasAccess = existing.unit?.facultyId === session.user.facultyId

      if (!hasAccess) throw new Error('Unauthorized access')

      if (parsed.data.unitId !== existing.room.unitId) {
        const canMove = await validateRoomPermission(session.user, parsed.data.unitId)
        if (!canMove) throw new Error('Cannot move room to unauthorized unit')
      }

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
        oldValues: existing.room,
        newValues: parsed.data,
      })
    })

    revalidatePath('/dashboard/rooms')
    return { success: true, message: 'Data ruangan diperbarui' }
  } catch (error) {
    const err = error as Error
    console.error('Update room error:', err)
    return { error: err.message || 'Gagal memperbarui ruangan' }
  }
}

export async function deleteRoom(id: string) {
  const session = await requireAuth({
    roles: ['super_admin', 'unit_admin', 'faculty_admin'],
  })

  try {
    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({
          room: rooms,
          unit: units,
        })
        .from(rooms)
        .leftJoin(units, eq(rooms.unitId, units.id))
        .where(eq(rooms.id, id))
        .limit(1)

      if (!existing) throw new Error('Room not found')

      let hasAccess = false
      if (session.user.role === 'super_admin') hasAccess = true
      else if (session.user.role === 'unit_admin')
        hasAccess = existing.room.unitId === session.user.unitId
      else if (session.user.role === 'faculty_admin')
        hasAccess = existing.unit?.facultyId === session.user.facultyId

      if (!hasAccess) throw new Error('Unauthorized delete')

      await tx.delete(rooms).where(eq(rooms.id, id))

      await tx.insert(auditLogs).values({
        id: randomUUID(),
        userId: session.user.id,
        action: 'DELETE',
        tableName: 'rooms',
        recordId: id,
        oldValues: existing.room,
      })
    })

    revalidatePath('/dashboard/rooms')
    return { success: true, message: 'Ruangan dihapus' }
  } catch (error) {
    const dbError = error as { code?: string; message?: string }

    if (dbError.code === '23503') {
      return { error: 'Gagal: Ruangan ini masih memiliki Aset atau Data Stok.' }
    }
    return { error: dbError.message || 'Gagal menghapus ruangan' }
  }
}
