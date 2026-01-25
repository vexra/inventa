import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm'

import { faculties, warehouses } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

import { WarehouseDialog } from './_components/warehouse-dialog'
import { WarehouseTable } from './_components/warehouse-table'

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

export default async function WarehousesPage({ searchParams }: PageProps) {
  const session = await requireAuth({
    roles: ['super_admin'],
  })

  const params = await searchParams
  const query = params.q || ''
  const currentPage = Number(params.page) || 1
  const itemsPerPage = Number(params.limit) || 10
  const sortCol = params.sort || 'name'
  const sortOrder = params.order || 'asc'
  const filterFacultyId = params.facultyId || 'all'

  const offset = (currentPage - 1) * itemsPerPage

  const textSearch = query
    ? or(ilike(warehouses.name, `%${query}%`), ilike(warehouses.description, `%${query}%`))
    : undefined

  const facultyFilter =
    filterFacultyId !== 'all' ? eq(warehouses.facultyId, filterFacultyId) : undefined

  const searchCondition = and(textSearch, facultyFilter)

  const orderColumn =
    sortCol === 'faculty'
      ? faculties.name
      : sortCol === 'type'
        ? warehouses.type
        : sortCol === 'description'
          ? warehouses.description
          : warehouses.name

  const orderBy = sortOrder === 'desc' ? desc(orderColumn) : asc(orderColumn)

  const dataPromise = db
    .select({
      id: warehouses.id,
      name: warehouses.name,
      type: warehouses.type,
      description: warehouses.description,
      facultyId: warehouses.facultyId,
      facultyName: faculties.name,
    })
    .from(warehouses)
    .leftJoin(faculties, eq(warehouses.facultyId, faculties.id))
    .where(searchCondition)
    .limit(itemsPerPage)
    .offset(offset)
    .orderBy(orderBy)

  const countPromise = db
    .select({ count: sql<number>`count(*)` })
    .from(warehouses)
    .where(searchCondition)

  const facultiesPromise = db
    .select({ id: faculties.id, name: faculties.name })
    .from(faculties)
    .orderBy(asc(faculties.name))

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
          <h1 className="text-3xl font-bold tracking-tight">Data Gudang</h1>
          <p className="text-muted-foreground">Kelola gudang penyimpanan Bahan Kimia & ATK</p>
        </div>
        <WarehouseDialog mode="create" faculties={facultiesList} />
      </div>

      <WarehouseTable
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
      />
    </div>
  )
}
