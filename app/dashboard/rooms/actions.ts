'use server'

import { revalidatePath } from 'next/cache'

import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'

import { auditLogs, buildings, rooms } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { roomSchema } from '@/lib/validations/room'

async function validateAccess(
  user: {
    role?: string | null
    id: string
    unitId?: string | null
    facultyId?: string | null
  },
  buildingId: string,
  targetUnitId?: string | null,
) {
  if (!user.role) return false

  if (user.role === 'super_admin') return true

  const [targetBuilding] = await db
    .select({ facultyId: buildings.facultyId })
    .from(buildings)
    .where(eq(buildings.id, buildingId))
    .limit(1)

  if (!targetBuilding) return false

  if (targetBuilding.facultyId !== user.facultyId) return false

  if (user.role === 'unit_admin') {
    if (targetUnitId !== user.unitId) return false
  }

  return true
}

export async function createRoom(data: unknown) {
  const session = await requireAuth({
    roles: ['super_admin', 'unit_admin', 'faculty_admin'],
  })

  const parsed = roomSchema.safeParse(data)
  if (!parsed.success) return { error: 'Data tidak valid' }

  const hasAccess = await validateAccess(session.user, parsed.data.buildingId, parsed.data.unitId)

  if (!hasAccess) {
    return { error: 'Anda tidak memiliki izin membuat ruangan di lokasi ini.' }
  }

  const newId = randomUUID()
  const qrToken = `ROOM-${randomUUID().split('-')[0]}-${Date.now()}`

  try {
    await db.transaction(async (tx) => {
      await tx.insert(rooms).values({
        id: newId,
        buildingId: parsed.data.buildingId,
        unitId: parsed.data.unitId || null,
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
          building: buildings,
        })
        .from(rooms)
        .leftJoin(buildings, eq(rooms.buildingId, buildings.id))
        .where(eq(rooms.id, id))
        .limit(1)

      if (!existing) throw new Error('Room not found')

      let hasAccess = false
      if (session.user.role === 'super_admin') hasAccess = true
      else if (session.user.role === 'faculty_admin')
        hasAccess = existing.building?.facultyId === session.user.facultyId
      else if (session.user.role === 'unit_admin')
        hasAccess = existing.room.unitId === session.user.unitId

      if (!hasAccess) throw new Error('Unauthorized access')

      const canMove = await validateAccess(session.user, parsed.data.buildingId, parsed.data.unitId)
      if (!canMove) throw new Error('Cannot move room to unauthorized location')

      await tx
        .update(rooms)
        .set({
          name: parsed.data.name,
          buildingId: parsed.data.buildingId,
          unitId: parsed.data.unitId || null,
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
          building: buildings,
        })
        .from(rooms)
        .leftJoin(buildings, eq(rooms.buildingId, buildings.id))
        .where(eq(rooms.id, id))
        .limit(1)

      if (!existing) throw new Error('Room not found')

      let hasAccess = false
      if (session.user.role === 'super_admin') hasAccess = true
      else if (session.user.role === 'faculty_admin')
        hasAccess = existing.building?.facultyId === session.user.facultyId
      else if (session.user.role === 'unit_admin')
        hasAccess = existing.room.unitId === session.user.unitId

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
    const dbError = error as { code?: string }
    if (dbError.code === '23503') {
      return { error: 'Gagal: Ruangan ini masih memiliki Aset atau Data Stok.' }
    }
    return { error: 'Gagal menghapus ruangan' }
  }
}
