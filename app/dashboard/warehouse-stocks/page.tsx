import { Package } from 'lucide-react'

import { PaginationControls } from '@/components/shared/pagination-controls'
import { SearchInput } from '@/components/shared/search-input'
import { requireAuth } from '@/lib/auth-guard'

import { StockFilter } from './_components/stock-filter'
import { StockTable } from './_components/stock-table'
import { getWarehouseStocks } from './actions'

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
    status?: 'all' | 'low' | 'out'
  }>
}

export default async function WarehouseStocksPage({ searchParams }: PageProps) {
  const session = await requireAuth({ roles: ['warehouse_staff'] })

  if (!session.user.warehouseId) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-2 p-6 text-center">
        <div className="rounded-full bg-red-100 p-3 text-red-600">
          <Package className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold">Akses Terbatas</h3>
        <p className="text-muted-foreground max-w-md text-sm">
          Akun Anda ({session.user.role}) tidak terhubung dengan data Gudang manapun. Silakan
          hubungi Administrator untuk mapping lokasi tugas.
        </p>
      </div>
    )
  }

  const params = await searchParams
  const query = params.q || ''
  const page = Number(params.page) || 1
  const statusFilter = params.status || 'all'

  const result = await getWarehouseStocks(page, 10, query, statusFilter)

  if ('error' in result) {
    return (
      <div className="p-6">
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
          Error: {result.error}
        </div>
      </div>
    )
  }

  const { data, metadata } = result

  const formattedData = data.map((item) => ({
    ...item,
    sku: item.sku || '-',
    category: item.category || '-',
    minimumStock: item.minimumStock,
    updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
  }))

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stok Gudang</h1>
          <p className="text-muted-foreground">Monitoring ketersediaan barang di gudang Anda.</p>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <SearchInput placeholder="Cari nama barang atau SKU..." className="w-full sm:max-w-xs" />
        <StockFilter currentFilter={statusFilter} />
      </div>

      <StockTable data={formattedData} />

      {metadata.totalPages > 1 && <PaginationControls totalPages={metadata.totalPages} />}
    </div>
  )
}
