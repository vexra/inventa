import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm'

import { buildings, faculties, roomTypeEnum, rooms, units } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

import { RoomDialog } from './_components/room-dialog'
import { RoomTable } from './_components/room-table'

type RoomType = (typeof roomTypeEnum.enumValues)[number]

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
    limit?: string
    sort?: string
    order?: 'asc' | 'desc'
    buildingId?: string
  }>
}

export default async function RoomsPage({ searchParams }: PageProps) {
  const session = await requireAuth({
    roles: ['super_admin', 'faculty_admin', 'unit_admin'],
  })

  const { role, facultyId: userFacultyId, unitId: userUnitId } = session.user
  const isSuperAdmin = role === 'super_admin'
  const isFacultyAdmin = role === 'faculty_admin'
  const isUnitAdmin = role === 'unit_admin'

  const fixedUnitId = isUnitAdmin ? userUnitId! : undefined

  const params = await searchParams
  const query = params.q || ''
  const currentPage = Number(params.page) || 1
  const itemsPerPage = Number(params.limit) || 10
  const sortCol = params.sort || 'name'
  const sortOrder = params.order || 'asc'
  const filterBuildingId = params.buildingId || 'all'

  const offset = (currentPage - 1) * itemsPerPage

  const textSearch = query
    ? or(
        ilike(rooms.name, `%${query}%`),
        ilike(rooms.description, `%${query}%`),
        ilike(buildings.name, `%${query}%`),
        ilike(units.name, `%${query}%`),
      )
    : undefined

  const buildingFilter =
    filterBuildingId !== 'all' ? eq(rooms.buildingId, filterBuildingId) : undefined

  let roleFilter
  if (isFacultyAdmin) {
    roleFilter = eq(buildings.facultyId, userFacultyId!)
  } else if (isUnitAdmin) {
    roleFilter = eq(rooms.unitId, userUnitId!)
  }

  const searchCondition = and(textSearch, buildingFilter, roleFilter)

  const orderColumn =
    sortCol === 'building'
      ? buildings.name
      : sortCol === 'unit'
        ? units.name
        : sortCol === 'type'
          ? rooms.type
          : sortCol === 'qr'
            ? rooms.qrToken
            : sortCol === 'description'
              ? rooms.description
              : rooms.name

  const orderBy = sortOrder === 'desc' ? desc(orderColumn) : asc(orderColumn)

  const dataPromise = db
    .select({
      id: rooms.id,
      name: rooms.name,
      description: rooms.description,
      type: rooms.type,
      qrToken: rooms.qrToken,
      buildingId: rooms.buildingId,
      buildingName: buildings.name,
      unitId: rooms.unitId,
      unitName: units.name,
    })
    .from(rooms)
    .leftJoin(buildings, eq(rooms.buildingId, buildings.id))
    .leftJoin(units, eq(rooms.unitId, units.id))
    .where(searchCondition)
    .limit(itemsPerPage)
    .offset(offset)
    .orderBy(orderBy)

  const countPromise = db
    .select({ count: sql<number>`count(*)` })
    .from(rooms)
    .leftJoin(buildings, eq(rooms.buildingId, buildings.id))
    .leftJoin(units, eq(rooms.unitId, units.id))
    .where(searchCondition)

  const buildingsCondition =
    !isSuperAdmin && userFacultyId ? eq(buildings.facultyId, userFacultyId) : undefined

  const buildingsPromise = db
    .select({
      id: buildings.id,
      name: buildings.name,
      facultyId: buildings.facultyId,
    })
    .from(buildings)
    .where(buildingsCondition)
    .orderBy(asc(buildings.name))

  let unitsCondition
  if (isFacultyAdmin) {
    unitsCondition = eq(units.facultyId, userFacultyId!)
  } else if (isUnitAdmin) {
    unitsCondition = eq(units.id, userUnitId!)
  }

  const unitsPromise = db
    .select({
      id: units.id,
      name: units.name,
      facultyId: units.facultyId,
    })
    .from(units)
    .where(unitsCondition)
    .orderBy(asc(units.name))

  const facultiesPromise = isSuperAdmin
    ? db
        .select({ id: faculties.id, name: faculties.name })
        .from(faculties)
        .orderBy(asc(faculties.name))
    : Promise.resolve([])

  const [data, countResult, buildingsList, unitsList, facultiesList] = await Promise.all([
    dataPromise,
    countPromise,
    buildingsPromise,
    unitsPromise,
    facultiesPromise,
  ])

  const totalItems = Number(countResult[0]?.count || 0)
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Ruangan</h1>
          <p className="text-muted-foreground">
            Kelola daftar ruangan, laboratorium, dan fasilitas.
          </p>
        </div>

        <RoomDialog
          mode="create"
          buildings={buildingsList}
          units={unitsList}
          faculties={facultiesList}
          fixedUnitId={fixedUnitId}
        />
      </div>

      <RoomTable
        data={data.map((d) => ({ ...d, type: d.type as RoomType }))}
        buildings={buildingsList}
        units={unitsList}
        faculties={facultiesList}
        metadata={{
          totalItems,
          totalPages,
          currentPage,
          itemsPerPage,
          hasNextPage: currentPage < totalPages,
          hasPrevPage: currentPage > 1,
        }}
        currentSort={{ column: sortCol, direction: sortOrder }}
        currentBuildingFilter={filterBuildingId}
        fixedUnitId={fixedUnitId}
      />
    </div>
  )
}
