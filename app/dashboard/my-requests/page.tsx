import { asc, eq } from 'drizzle-orm'

import { PaginationControls } from '@/components/shared/pagination-controls'
import { SearchInput } from '@/components/shared/search-input'
import { consumables, warehouseStocks, warehouses } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

import { RequestDialog } from './_components/request-dialog'
import { RequestTable } from './_components/request-table'
import { getMyRequests } from './actions'

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
  }>
}

export default async function MyRequestsPage({ searchParams }: PageProps) {
  await requireAuth({ roles: ['unit_staff'] })

  const params = await searchParams
  const query = params.q || ''
  const page = Number(params.page) || 1
  const limit = 10

  const [requestsData, warehousesList, availableStocks] = await Promise.all([
    getMyRequests(page, limit, query),

    db
      .select({
        id: warehouses.id,
        name: warehouses.name,
      })
      .from(warehouses)
      .orderBy(asc(warehouses.name)),

    db
      .select({
        consumableId: consumables.id,
        warehouseId: warehouseStocks.warehouseId,
        name: consumables.name,
        unit: consumables.baseUnit,
      })
      .from(warehouseStocks)
      .innerJoin(consumables, eq(warehouseStocks.consumableId, consumables.id))
      .orderBy(asc(consumables.name)),
  ])

  const { data, totalItems } = requestsData
  const totalPages = Math.ceil(totalItems / limit)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Permintaan Saya</h1>
          <p className="text-muted-foreground">
            Ajukan permintaan barang baru dan pantau statusnya di sini.
          </p>
        </div>

        <RequestDialog warehouses={warehousesList} availableStocks={availableStocks} />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <SearchInput placeholder="Cari ID Request..." className="w-full sm:max-w-xs" />
      </div>

      <div className="flex flex-col gap-4">
        <RequestTable data={data} />

        {totalPages > 1 && <PaginationControls totalPages={totalPages} />}
      </div>
    </div>
  )
}
