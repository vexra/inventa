import { Building2 } from 'lucide-react'

import { requireAuth } from '@/lib/auth-guard'

import { StockFilter } from './_components/stock-filter'
import { StockTable } from './_components/stock-table'
import { WarehouseSelector } from './_components/warehouse-selector'
import { getAllWarehouses, getWarehouseStocks } from './actions'

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
    limit?: string
    status?: string
    warehouseId?: string
    sort?: string
    order?: 'asc' | 'desc'
  }>
}

export default async function WarehouseStocksPage({ searchParams }: PageProps) {
  const session = await requireAuth({ roles: ['warehouse_staff', 'faculty_admin'] })
  const isFacultyAdmin = session.user.role === 'faculty_admin'

  const params = await searchParams
  const query = params.q || ''
  const page = Number(params.page) || 1
  const limit = Number(params.limit) || 10
  const sortCol = params.sort || 'name'
  const sortOrder = params.order || 'asc'

  // LOGIKA UTAMA: Menentukan Target Gudang
  let targetWarehouseId = session.user.warehouseId // Default null untuk faculty admin
  let availableWarehouses: { id: string; name: string }[] = []

  if (isFacultyAdmin) {
    // 1. Ambil semua opsi gudang
    availableWarehouses = await getAllWarehouses()

    // 2. Jika ada di URL, pakai itu. Jika tidak, pakai gudang pertama dari list.
    targetWarehouseId = params.warehouseId || availableWarehouses[0]?.id
  }

  // Jika setelah logic di atas ID gudang masih kosong (misal data gudang 0), tampilkan empty state
  if (!targetWarehouseId) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 rounded-full bg-red-50 p-4">
          <Building2 className="h-8 w-8 text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">
          {isFacultyAdmin ? 'Belum Ada Data Gudang' : 'Akses Gudang Belum Diatur'}
        </h3>
        <p className="text-muted-foreground mt-2 max-w-md">
          {isFacultyAdmin
            ? 'Belum ada gudang yang terdaftar di sistem.'
            : 'Akun Anda belum terhubung dengan gudang manapun.'}
        </p>
      </div>
    )
  }

  // Filter Status
  const rawStatus = params.status
  const statusFilter = (['all', 'low', 'out'].includes(rawStatus || '') ? rawStatus : 'all') as
    | 'all'
    | 'low'
    | 'out'

  // Fetch Data
  const result = await getWarehouseStocks(
    page,
    limit,
    query,
    statusFilter,
    targetWarehouseId, // Kirim ID yang sudah dipastikan ada
    sortCol,
    sortOrder,
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

      {'error' in result ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center text-red-600">
          <Building2 className="mb-3 h-10 w-10 opacity-20" />
          <p className="font-medium">{result.error}</p>
        </div>
      ) : (
        <StockTable
          data={result.data}
          metadata={result.metadata}
          currentSort={{ column: sortCol, direction: sortOrder }}
        >
          <div className="flex items-center gap-2">
            {isFacultyAdmin && (
              <WarehouseSelector
                warehouses={availableWarehouses}
                currentWarehouseId={targetWarehouseId}
              />
            )}
            <StockFilter currentFilter={statusFilter} />
          </div>
        </StockTable>
      )}
    </div>
  )
}
