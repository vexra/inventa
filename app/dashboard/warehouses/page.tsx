import { asc, eq, ilike, or, sql } from 'drizzle-orm'

import { PaginationControls } from '@/components/shared/pagination-controls'
import { SearchInput } from '@/components/shared/search-input'
import { faculties, warehouses } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

import { WarehouseDialog } from './_components/warehouse-dialog'
import { WarehouseList } from './_components/warehouse-list'

const ITEMS_PER_PAGE = 10

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
  }>
}

export default async function WarehousesPage({ searchParams }: PageProps) {
  await requireAuth({
    roles: ['super_admin'],
  })

  const params = await searchParams
  const query = params.q || ''
  const currentPage = Number(params.page) || 1
  const offset = (currentPage - 1) * ITEMS_PER_PAGE

  const searchCondition = query
    ? or(ilike(warehouses.name, `%${query}%`), ilike(warehouses.description, `%${query}%`))
    : undefined

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
    .limit(ITEMS_PER_PAGE)
    .offset(offset)
    .orderBy(asc(warehouses.name))

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
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Gudang</h1>
          <p className="text-muted-foreground">Kelola gudang penyimpanan Bahan Kimia & ATK</p>
        </div>
        <WarehouseDialog mode="create" faculties={facultiesList} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <SearchInput placeholder="Cari nama gudang..." className="w-full sm:max-w-xs" />
      </div>

      <div className="flex flex-col gap-4">
        <WarehouseList data={data} faculties={facultiesList} />

        {totalPages > 1 && <PaginationControls totalPages={totalPages} />}

        {data.length === 0 && query && (
          <div className="text-muted-foreground py-10 text-center">
            Tidak ditemukan gudang dengan kata kunci <strong>&quot;{query}&quot;</strong>.
          </div>
        )}
      </div>
    </div>
  )
}
