import { asc, eq, sql } from 'drizzle-orm'

import { PaginationControls } from '@/components/shared/pagination-controls'
import { SearchInput } from '@/components/shared/search-input'
import { consumables, warehouseStocks, warehouses } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

import { RequestDialog } from './_components/request-dialog'
import { RequestTable } from './_components/request-table'
import { getConsumableRequests } from './actions'

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
  }>
}

export default async function RequestConsumablesPage({ searchParams }: PageProps) {
  const session = await requireAuth({ roles: ['unit_staff', 'unit_admin'] })
  const userRole = session.user.role

  const params = await searchParams
  const query = params.q || ''
  const page = Number(params.page) || 1
  const limit = 10

  const [requestsData, warehousesList, rawStocks] = await Promise.all([
    getConsumableRequests(page, limit, query),

    db
      .select({
        id: warehouses.id,
        name: warehouses.name,
      })
      .from(warehouses)
      .orderBy(asc(warehouses.name)),

    db
      .select({
        warehouseId: warehouseStocks.warehouseId,
        consumableId: consumables.id,
        name: consumables.name,
        unit: consumables.baseUnit,
        quantity: warehouseStocks.quantity,
      })
      .from(warehouseStocks)
      .innerJoin(consumables, eq(warehouseStocks.consumableId, consumables.id))
      .where(sql`${warehouseStocks.quantity} > 0`)
      .orderBy(asc(consumables.name)),
  ])

  const availableStocks = rawStocks.map((stock) => ({
    ...stock,
    quantity: stock.quantity ?? 0,
  }))

  const { data, totalItems } = requestsData
  const totalPages = Math.ceil(totalItems / limit)
  const isUnitAdmin = userRole === 'unit_admin'

  const pageTitle = isUnitAdmin ? 'Permintaan Unit' : 'Permintaan Saya'
  const pageDescription = isUnitAdmin
    ? 'Pantau semua permintaan barang dari staff di Unit Kerja Anda.'
    : 'Ajukan permintaan barang baru dan pantau statusnya di sini.'

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{pageTitle}</h1>
          <p className="text-muted-foreground">{pageDescription}</p>
        </div>

        <RequestDialog warehouses={warehousesList} stocks={availableStocks} />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <SearchInput
          placeholder={isUnitAdmin ? 'Cari Kode / Nama Pemohon...' : 'Cari Kode Request...'}
          className="w-full sm:max-w-xs"
        />
      </div>

      <div className="flex flex-col gap-4">
        <RequestTable data={data} isUnitAdmin={isUnitAdmin} />

        {totalPages > 1 && <PaginationControls totalPages={totalPages} />}
      </div>
    </div>
  )
}
