import { requireAuth } from '@/lib/auth-guard'

import { StockTable } from './_components/stock-table'
import { getWarehouseStocks } from './actions'

const ITEMS_PER_PAGE = 10

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
    sort?: string
    order?: 'asc' | 'desc'
  }>
}

export default async function StockOpnamePage({ searchParams }: PageProps) {
  const session = await requireAuth({ roles: ['warehouse_staff'] })

  if (!session.user.warehouseId) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center">
        <h1 className="text-xl font-bold text-red-600">Akses Ditolak</h1>
        <p className="text-muted-foreground">
          Akun Anda berstatus Staff Gudang, tetapi belum ditetapkan ke gudang manapun.
          <br />
          Silakan hubungi Administrator.
        </p>
      </div>
    )
  }

  const params = await searchParams
  const query = params.q || ''
  const currentPage = Number(params.page) || 1
  const sortCol = params.sort || 'name'
  const sortOrder = params.order || 'asc'

  const { data, totalItems } = await getWarehouseStocks(
    currentPage,
    ITEMS_PER_PAGE,
    query,
    sortCol,
    sortOrder,
  )

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Stok Opname</h1>
        <p className="text-muted-foreground">Lakukan penyesuaian stok fisik (Opname) per barang.</p>
      </div>

      <StockTable
        data={data || []}
        metadata={{
          totalItems,
          totalPages,
          currentPage,
          itemsPerPage: ITEMS_PER_PAGE,
          hasNextPage: currentPage < totalPages,
          hasPrevPage: currentPage > 1,
        }}
        currentSort={{
          column: sortCol,
          direction: sortOrder,
        }}
      />
    </div>
  )
}
