import { and, asc, eq, ilike, or, sql } from 'drizzle-orm'

import { PaginationControls } from '@/components/shared/pagination-controls'
import { SearchInput } from '@/components/shared/search-input'
import { faculties, rooms, units } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

import { RoomDialog } from './_components/room-dialog'
import { RoomList } from './_components/room-list'

const ITEMS_PER_PAGE = 10

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
  }>
}

export default async function RoomsPage({ searchParams }: PageProps) {
  const session = await requireAuth({
    roles: ['super_admin', 'unit_admin', 'faculty_admin'],
  })

  const { role, unitId, facultyId } = session.user

  const isUnitAdmin = role === 'unit_admin'
  const isSuperAdmin = role === 'super_admin'

  const fixedUnitId = isUnitAdmin ? unitId! : undefined

  const params = await searchParams
  const query = params.q || ''
  const currentPage = Number(params.page) || 1
  const offset = (currentPage - 1) * ITEMS_PER_PAGE

  const textSearch = query
    ? or(
        ilike(rooms.name, `%${query}%`),
        ilike(rooms.description, `%${query}%`),
        ilike(units.name, `%${query}%`),
      )
    : undefined

  let roleFilter
  let unitsCondition

  if (role === 'unit_admin') {
    roleFilter = eq(rooms.unitId, unitId!)
    unitsCondition = eq(units.id, unitId!)
  } else if (role === 'faculty_admin') {
    roleFilter = eq(units.facultyId, facultyId!)
    unitsCondition = eq(units.facultyId, facultyId!)
  }

  const finalCondition = and(textSearch, roleFilter)

  const dataPromise = db
    .select({
      id: rooms.id,
      name: rooms.name,
      description: rooms.description,
      type: rooms.type,
      qrToken: rooms.qrToken,
      unitId: rooms.unitId,
      unitName: units.name,
    })
    .from(rooms)
    .leftJoin(units, eq(rooms.unitId, units.id))
    .where(finalCondition)
    .limit(ITEMS_PER_PAGE)
    .offset(offset)
    .orderBy(asc(rooms.name))

  const countPromise = db
    .select({ count: sql<number>`count(*)` })
    .from(rooms)
    .leftJoin(units, eq(rooms.unitId, units.id))
    .where(finalCondition)

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

  const [data, countResult, unitsList, facultiesList] = await Promise.all([
    dataPromise,
    countPromise,
    unitsPromise,
    facultiesPromise,
  ])

  const totalItems = Number(countResult[0]?.count || 0)
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)
  const showUnitColumn = role === 'super_admin' || role === 'faculty_admin'

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Ruangan</h1>
          <p className="text-muted-foreground">
            Kelola daftar ruangan, laboratorium, dan kantor unit.
          </p>
        </div>

        <RoomDialog
          mode="create"
          units={unitsList}
          faculties={facultiesList}
          fixedUnitId={fixedUnitId}
        />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <SearchInput placeholder="Cari ruangan..." className="w-full sm:max-w-xs" />
      </div>

      <div className="flex flex-col gap-4">
        <RoomList
          data={data}
          units={unitsList}
          faculties={facultiesList}
          showUnitColumn={showUnitColumn}
          fixedUnitId={fixedUnitId}
        />

        {totalPages > 1 && <PaginationControls totalPages={totalPages} />}
      </div>
    </div>
  )
}
