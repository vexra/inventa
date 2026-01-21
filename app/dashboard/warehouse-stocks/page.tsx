import { Building2 } from 'lucide-react'

import { PaginationControls } from '@/components/shared/pagination-controls'
import { SearchInput } from '@/components/shared/search-input'
import { requireAuth } from '@/lib/auth-guard'

import { StockFilter } from './_components/stock-filter'
import { StockTable } from './_components/stock-table'
import { WarehouseSelector } from './_components/warehouse-selector'
import { getAllWarehouses, getWarehouseStocks } from './actions'

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
    status?: string
    warehouseId?: string
  }>
}

export default async function WarehouseStocksPage({ searchParams }: PageProps) {
  const session = await requireAuth({ roles: ['warehouse_staff', 'faculty_admin'] })
  const isFacultyAdmin = session.user.role === 'faculty_admin'

  const params = await searchParams
  const query = params.q || ''
  const page = Number(params.page) || 1

  let targetWarehouseId = session.user.warehouseId
  let availableWarehouses: { id: string; name: string }[] = []

  if (isFacultyAdmin) {
    availableWarehouses = await getAllWarehouses()
    targetWarehouseId = params.warehouseId || availableWarehouses[0]?.id
  }

  if (!isFacultyAdmin && !targetWarehouseId) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 rounded-full bg-red-50 p-4">
          <Building2 className="h-8 w-8 text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Akses Gudang Belum Diatur</h3>
        <p className="text-muted-foreground mt-2 max-w-md">
          Akun Anda ({session.user.role}) belum terhubung dengan gudang manapun.
        </p>
      </div>
    )
  }

  const rawStatus = params.status
  const statusFilter = (['all', 'low', 'out'].includes(rawStatus || '') ? rawStatus : 'all') as
    | 'all'
    | 'low'
    | 'out'

  const result = await getWarehouseStocks(
    page,
    10,
    query,
    statusFilter,
    targetWarehouseId ?? undefined,
  )

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stok Gudang</h1>
          <p className="text-muted-foreground">
            {isFacultyAdmin
              ? 'Monitoring inventaris seluruh unit.'
              : 'Pantau ketersediaan barang di gudang Anda.'}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput placeholder="Cari barang atau SKU..." className="w-full sm:max-w-xs" />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {isFacultyAdmin && (
            <div className="w-full sm:w-auto">
              <WarehouseSelector
                warehouses={availableWarehouses}
                currentWarehouseId={targetWarehouseId ?? undefined}
              />
            </div>
          )}

          <div className="overflow-x-auto pb-1 sm:pb-0">
            <StockFilter currentFilter={statusFilter} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {'error' in result ? (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center text-red-600 dark:border-red-900/50 dark:text-red-400">
            <Building2 className="mb-3 h-10 w-10 opacity-20" />
            <p className="font-medium">
              {result.error === 'Silakan pilih gudang terlebih dahulu.'
                ? 'Pilih gudang untuk melihat data.'
                : result.error}
            </p>
          </div>
        ) : (
          <StockTable data={result.data} />
        )}

        {!('error' in result) && result.metadata.totalPages > 1 && (
          <PaginationControls totalPages={result.metadata.totalPages} />
        )}
      </div>
    </div>
  )
}
