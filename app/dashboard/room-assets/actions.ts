'use server'

import { SQL, and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm'

import { assetModels, buildings, categories, fixedAssets, rooms } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

export async function getRoomAssets(
  page: number = 1,
  limit: number = 10,
  query: string = '',
  statusFilter: string = '',
  targetRoomId?: string,
  sortCol: string = 'name',
  sortOrder: 'asc' | 'desc' = 'asc',
) {
  const session = await requireAuth({
    roles: ['unit_staff', 'unit_admin'],
  })

  const userUnitId = session.user.unitId

  if (!userUnitId) {
    return { error: 'Akun Anda tidak terhubung dengan Unit manapun.' }
  }

  try {
    const offset = (page - 1) * limit

    // Base condition: assets in rooms belonging to user's unit
    const baseConditions = [
      eq(rooms.unitId, userUnitId),
      // Only show assets that are in a room (not in warehouse)
      eq(fixedAssets.roomId, rooms.id),
      targetRoomId ? eq(rooms.id, targetRoomId) : undefined,
      query
        ? or(
            ilike(assetModels.name, `%${query}%`),
            ilike(fixedAssets.qrToken, `%${query}%`),
            ilike(fixedAssets.inventoryNumber, `%${query}%`),
            ilike(fixedAssets.serialNumber, `%${query}%`),
          )
        : undefined,
    ].filter(Boolean) as SQL[]

    // Main query to get fixed assets with room and model info
    const rows = await db
      .select({
        id: fixedAssets.id,
        qrToken: fixedAssets.qrToken,
        inventoryNumber: fixedAssets.inventoryNumber,
        serialNumber: fixedAssets.serialNumber,
        isMovable: fixedAssets.isMovable,
        movementStatus: fixedAssets.movementStatus,
        condition: fixedAssets.condition,
        procurementYear: fixedAssets.procurementYear,
        price: fixedAssets.price,
        notes: fixedAssets.notes,
        createdAt: fixedAssets.createdAt,

        modelId: assetModels.id,
        modelName: assetModels.name,
        modelNumber: assetModels.modelNumber,
        specifications: assetModels.specifications,

        categoryName: categories.name,

        roomId: rooms.id,
        roomName: rooms.name,
        roomType: rooms.type,

        buildingName: buildings.name,
      })
      .from(fixedAssets)
      .innerJoin(assetModels, eq(fixedAssets.modelId, assetModels.id))
      .innerJoin(rooms, eq(fixedAssets.roomId, rooms.id))
      .innerJoin(buildings, eq(rooms.buildingId, buildings.id))
      .leftJoin(categories, eq(assetModels.categoryId, categories.id))
      .where(and(...baseConditions))

    // Apply status filter in memory (since it's on the asset itself, not join)
    let filteredRows = rows
    if (statusFilter === 'in_store') {
      filteredRows = rows.filter(r => r.movementStatus === 'IN_STORE')
    } else if (statusFilter === 'in_use') {
      filteredRows = rows.filter(r => r.movementStatus === 'IN_USE')
    } else if (statusFilter === 'in_transit') {
      filteredRows = rows.filter(r => r.movementStatus === 'IN_TRANSIT')
    } else if (statusFilter === 'damaged') {
      filteredRows = rows.filter(r => r.condition !== 'GOOD')
    }

    // Sort
    const sortMultiplier = sortOrder === 'asc' ? 1 : -1
    filteredRows.sort((a, b) => {
      if (sortCol === 'name') {
        return sortMultiplier * a.modelName.localeCompare(b.modelName)
      } else if (sortCol === 'room') {
        return sortMultiplier * a.roomName.localeCompare(b.roomName)
      } else if (sortCol === 'condition') {
        return sortMultiplier * a.condition.localeCompare(b.condition)
      } else if (sortCol === 'status') {
        return sortMultiplier * a.movementStatus.localeCompare(b.movementStatus)
      }
      return 0
    })

    // Pagination
    const totalItems = filteredRows.length
    const totalPages = Math.ceil(totalItems / limit)
    const paginatedRows = filteredRows.slice(offset, offset + limit)

    // Format data
    const formattedData = paginatedRows.map((row) => ({
      id: row.id,
      qrToken: row.qrToken,
      inventoryNumber: row.inventoryNumber,
      serialNumber: row.serialNumber,
      isMovable: row.isMovable,
      movementStatus: row.movementStatus,
      condition: row.condition,
      procurementYear: row.procurementYear,
      price: row.price ? Number(row.price) : null,
      notes: row.notes,
      createdAt: row.createdAt,

      model: {
        id: row.modelId,
        name: row.modelName,
        modelNumber: row.modelNumber,
        specifications: row.specifications,
      },
      category: row.categoryName,
      room: {
        id: row.roomId,
        name: row.roomName,
        type: row.roomType,
      },
      building: row.buildingName,
    }))

    return {
      data: formattedData,
      metadata: {
        totalItems,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    }
  } catch (error) {
    console.error('Error fetching room assets:', error)
    return { error: 'Gagal memuat data aset tetap.' }
  }
}
