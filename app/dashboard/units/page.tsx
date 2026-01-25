import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm'

import { faculties, units } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

import { UnitDialog } from './_components/unit-dialog'
import { UnitTable } from './_components/unit-table'

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
    limit?: string
    sort?: string
    order?: 'asc' | 'desc'
    facultyId?: string
  }>
}

export default async function UnitsPage({ searchParams }: PageProps) {
  const session = await requireAuth({ roles: ['super_admin', 'faculty_admin'] })

  const { role, facultyId: userFacultyId } = session.user
  const isSuperAdmin = role === 'super_admin'
  const fixedFacultyId = role === 'faculty_admin' ? userFacultyId! : undefined

  const params = await searchParams
  const query = params.q || ''
  const currentPage = Number(params.page) || 1
  const itemsPerPage = Number(params.limit) || 10
  const sortCol = params.sort || 'name'
  const sortOrder = params.order || 'asc'
  const filterFacultyId = params.facultyId || 'all'

  const offset = (currentPage - 1) * itemsPerPage

  const textSearch = query
    ? or(ilike(units.name, `%${query}%`), ilike(units.description, `%${query}%`))
    : undefined

  const facultyFilter =
    isSuperAdmin && filterFacultyId !== 'all' ? eq(units.facultyId, filterFacultyId) : undefined

  const roleFilter = !isSuperAdmin ? eq(units.facultyId, userFacultyId!) : undefined

  const searchCondition = and(textSearch, facultyFilter, roleFilter)

  const orderColumn =
    sortCol === 'faculty'
      ? faculties.name
      : sortCol === 'description'
        ? units.description
        : units.name

  const orderBy = sortOrder === 'desc' ? desc(orderColumn) : asc(orderColumn)

  const dataPromise = db
    .select({
      id: units.id,
      name: units.name,
      description: units.description,
      facultyId: units.facultyId,
      facultyName: faculties.name,
    })
    .from(units)
    .leftJoin(faculties, eq(units.facultyId, faculties.id))
    .where(searchCondition)
    .limit(itemsPerPage)
    .offset(offset)
    .orderBy(orderBy)

  const countPromise = db
    .select({ count: sql<number>`count(*)` })
    .from(units)
    .where(searchCondition)

  const facultiesPromise = isSuperAdmin
    ? db
        .select({
          id: faculties.id,
          name: faculties.name,
        })
        .from(faculties)
        .orderBy(asc(faculties.name))
    : Promise.resolve([])

  const [data, countResult, facultiesList] = await Promise.all([
    dataPromise,
    countPromise,
    facultiesPromise,
  ])

  const totalItems = Number(countResult[0]?.count || 0)
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Unit</h1>
          <p className="text-muted-foreground">Kelola daftar unit kerja dan departemen</p>
        </div>

        <UnitDialog mode="create" faculties={facultiesList} fixedFacultyId={fixedFacultyId} />
      </div>

      <UnitTable
        data={data}
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
        currentFacultyFilter={filterFacultyId}
        fixedFacultyId={fixedFacultyId}
      />
    </div>
  )
}
