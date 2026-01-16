import { Metadata } from 'next'

import { and, asc, eq, ilike, or, sql } from 'drizzle-orm'

import { PaginationControls } from '@/components/shared/pagination-controls'
import { SearchInput } from '@/components/shared/search-input'
import { categories, consumables, warehouseStocks, warehouses } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

import { StockTable } from './_components/stock-table'

export const metadata: Metadata = {
  title: 'Stock Opname',
  description: 'Lakukan penyesuaian stok fisik dan sistem.',
}

const ITEMS_PER_PAGE = 10

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
  }>
}

export default async function StockOpnamePage({ searchParams }: PageProps) {
  // 1. HANYA Warehouse Staff yang boleh masuk
  const session = await requireAuth({ roles: ['warehouse_staff'] })

  // 2. Cek apakah user punya Gudang. Jika tidak, tampilkan pesan error.
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
  const offset = (currentPage - 1) * ITEMS_PER_PAGE

  const warehouseCondition = eq(warehouseStocks.warehouseId, session.user.warehouseId)

  const searchCondition = query
    ? or(
        ilike(consumables.name, `%${query}%`),
        ilike(categories.name, `%${query}%`),
        ilike(warehouseStocks.batchNumber, `%${query}%`),
      )
    : undefined

  // 5. Gabungkan Filter (AND)
  // Logic: (Search) AND (Warehouse Milik User)
  const finalCondition = and(searchCondition, warehouseCondition)

  // Query Data
  const dataPromise = db
    .select({
      id: warehouseStocks.id,
      consumableId: warehouseStocks.consumableId,
      quantity: warehouseStocks.quantity,
      batchNumber: warehouseStocks.batchNumber,
      expiryDate: warehouseStocks.expiryDate,
      consumableName: consumables.name,
      unit: consumables.baseUnit,
      categoryName: categories.name,
      warehouseName: warehouses.name,
    })
    .from(warehouseStocks)
    .leftJoin(consumables, eq(warehouseStocks.consumableId, consumables.id))
    .leftJoin(categories, eq(consumables.categoryId, categories.id))
    .leftJoin(warehouses, eq(warehouseStocks.warehouseId, warehouses.id))
    .where(finalCondition) // Gunakan filter gabungan
    .limit(ITEMS_PER_PAGE)
    .offset(offset)
    .orderBy(asc(consumables.name))

  // Query Total Count
  const countPromise = db
    .select({ count: sql<number>`count(*)` })
    .from(warehouseStocks)
    .leftJoin(consumables, eq(warehouseStocks.consumableId, consumables.id))
    .leftJoin(categories, eq(consumables.categoryId, categories.id))
    .where(finalCondition) // Gunakan filter gabungan

  const [stocks, countResult] = await Promise.all([dataPromise, countPromise])

  const totalItems = Number(countResult[0]?.count || 0)
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)

  const formattedStocks = stocks.map((item) => ({
    id: item.id,
    consumableId: item.consumableId,
    consumableName: item.consumableName || 'Unknown Item',
    categoryName: item.categoryName,
    unit: item.unit || 'unit',
    quantity: Number(item.quantity),
    batchNumber: item.batchNumber,
    expiryDate: item.expiryDate,
  }))

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stock Opname</h1>
        <p className="text-muted-foreground"> Penyesuaian stok untuk gudang Anda.</p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <SearchInput
          placeholder="Cari barang, kategori, atau batch..."
          className="w-full sm:max-w-sm"
        />
      </div>

      <div className="flex flex-col gap-4">
        <StockTable data={formattedStocks} />

        {totalPages > 1 && <PaginationControls totalPages={totalPages} />}

        {formattedStocks.length === 0 && query && (
          <div className="text-muted-foreground py-10 text-center">
            Tidak ditemukan pengajuan dengan kata kunci <strong>&quot;{query}&quot;</strong>.
          </div>
        )}
      </div>
    </div>
  )
}
