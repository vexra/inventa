import { asc, ilike, or, sql } from 'drizzle-orm'

import { warehouses } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

import { WarehouseDialog } from './_components/warehouse-dialog'
import { WarehouseList } from './_components/warehouse-list'
import { WarehousePagination } from './_components/warehouse-pagination'
import { WarehouseSearch } from './_components/warehouse-search'

const ITEMS_PER_PAGE = 10

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
  }>
}

export default async function WarehousesPage({ searchParams }: PageProps) {
  await requireAuth({
    roles: ['administrator'],
  })

  const params = await searchParams
  const query = params.q || ''
  const currentPage = Number(params.page) || 1
  const offset = (currentPage - 1) * ITEMS_PER_PAGE

  const searchCondition = query
    ? or(ilike(warehouses.name, `%${query}%`), ilike(warehouses.location, `%${query}%`))
    : undefined

  const dataPromise = db
    .select()
    .from(warehouses)
    .where(searchCondition)
    .limit(ITEMS_PER_PAGE)
    .offset(offset)
    .orderBy(asc(warehouses.name))

  const countPromise = db
    .select({ count: sql<number>`count(*)` })
    .from(warehouses)
    .where(searchCondition)

  const [data, countResult] = await Promise.all([dataPromise, countPromise])

  const totalItems = Number(countResult[0]?.count || 0)
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Gudang</h1>
          <p className="text-muted-foreground">Kelola daftar gudang penyimpanan barang</p>
        </div>
        <WarehouseDialog mode="create" />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <WarehouseSearch />
      </div>

      <div className="flex flex-col gap-4">
        <WarehouseList data={data} />

        {totalPages > 1 && <WarehousePagination totalPages={totalPages} />}

        {data.length === 0 && query && (
          <div className="text-muted-foreground py-10 text-center">
            Tidak ditemukan gudang dengan kata kunci <strong>&quot;{query}&quot;</strong>.
          </div>
        )}
      </div>
    </div>
  )
}
