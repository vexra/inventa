import { and, asc, countDistinct, eq, ilike, or, sql } from 'drizzle-orm'

import { PaginationControls } from '@/components/shared/pagination-controls'
import { SearchInput } from '@/components/shared/search-input'
import { categories, consumables, warehouseStocks } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

import { StockTable } from './_components/stock-table'

const ITEMS_PER_PAGE = 10

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
  }>
}

export default async function StockOpnamePage({ searchParams }: PageProps) {
  // 1. Autentikasi: Pastikan user adalah Staff Gudang
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
  const offset = (currentPage - 1) * ITEMS_PER_PAGE

  // 2. Filter Kondisi
  const warehouseCondition = eq(warehouseStocks.warehouseId, session.user.warehouseId)

  let searchCondition = undefined
  if (query) {
    searchCondition = or(
      ilike(consumables.name, `%${query}%`),
      ilike(consumables.sku, `%${query}%`),
      ilike(categories.name, `%${query}%`),
      ilike(warehouseStocks.batchNumber, `%${query}%`), // Bisa cari by nomor batch juga
    )
  }

  const finalCondition = and(warehouseCondition, searchCondition)

  // 3. Query Utama dengan Grouping & Aggregation
  // Kita mengambil data per ITEM, lalu menumpuk batch-nya ke dalam array JSON
  const stocksPromise = db
    .select({
      consumableId: warehouseStocks.consumableId,
      consumableName: consumables.name,
      categoryName: categories.name,
      unit: consumables.baseUnit,
      // Hitung total stok dari semua batch
      totalQuantity: sql<number>`sum(${warehouseStocks.quantity})`,
      // Hitung jumlah batch
      batchCount: sql<number>`count(${warehouseStocks.id})`,
      // Ambil detail batch dalam format JSON Array
      batches: sql<
        {
          id: string
          batchNumber: string | null
          quantity: number
          expiryDate: string | null
        }[]
      >`json_agg(
        json_build_object(
          'id', ${warehouseStocks.id},
          'batchNumber', ${warehouseStocks.batchNumber},
          'quantity', ${warehouseStocks.quantity},
          'expiryDate', ${warehouseStocks.expiryDate}
        ) ORDER BY ${warehouseStocks.expiryDate} ASC
      )`,
    })
    .from(warehouseStocks)
    .innerJoin(consumables, eq(warehouseStocks.consumableId, consumables.id))
    .leftJoin(categories, eq(consumables.categoryId, categories.id))
    .where(finalCondition)
    .groupBy(warehouseStocks.consumableId, consumables.name, categories.name, consumables.baseUnit)
    .orderBy(asc(consumables.name))
    .limit(ITEMS_PER_PAGE)
    .offset(offset)

  // 4. Query untuk Total Count (Pagination)
  // Kita hitung jumlah UNIQUE consumableId yang ada di gudang ini
  const countPromise = db
    .select({ count: countDistinct(warehouseStocks.consumableId) })
    .from(warehouseStocks)
    .innerJoin(consumables, eq(warehouseStocks.consumableId, consumables.id))
    .leftJoin(categories, eq(consumables.categoryId, categories.id))
    .where(finalCondition)

  // Jalankan query secara paralel
  const [stocks, countResult] = await Promise.all([stocksPromise, countPromise])

  const totalItems = countResult[0]?.count || 0
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)

  // 5. Format Data (Mapping)
  // Konversi tipe data agar sesuai dengan props StockTable
  const formattedStocks = stocks.map((item) => ({
    consumableId: item.consumableId,
    consumableName: item.consumableName,
    categoryName: item.categoryName,
    unit: item.unit,
    totalQuantity: Number(item.totalQuantity),
    batchCount: Number(item.batchCount),
    batches: item.batches.map((b) => ({
      id: b.id,
      batchNumber: b.batchNumber,
      quantity: Number(b.quantity),
      expiryDate: b.expiryDate ? new Date(b.expiryDate) : null,
    })),
  }))

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Stok Opname</h1>
        <p className="text-muted-foreground">Lakukan penyesuaian stok fisik (Opname) per barang.</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <SearchInput
          placeholder="Cari nama barang, SKU, atau no. batch..."
          className="w-full sm:max-w-sm"
        />
      </div>

      <div className="flex flex-col gap-4">
        {/* Table menerima data yang sudah di-group */}
        <StockTable data={formattedStocks} />

        {totalPages > 1 && <PaginationControls totalPages={totalPages} />}

        {formattedStocks.length === 0 && (
          <div className="text-muted-foreground py-10 text-center text-sm">
            {query
              ? 'Tidak ada barang yang cocok dengan pencarian.'
              : 'Belum ada stok di gudang ini.'}
          </div>
        )}
      </div>
    </div>
  )
}
