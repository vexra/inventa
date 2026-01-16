import { asc, eq, ilike, or, sql } from 'drizzle-orm'

import { PaginationControls } from '@/components/shared/pagination-controls'
import { SearchInput } from '@/components/shared/search-input'
import { categories, consumables } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

import { ConsumableDialog } from './_components/consumable-dialog'
import { ConsumableList } from './_components/consumable-list'

const ITEMS_PER_PAGE = 10

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
  }>
}

export default async function ConsumablesPage({ searchParams }: PageProps) {
  await requireAuth({ roles: ['super_admin', 'warehouse_staff'] })

  const params = await searchParams
  const query = params.q || ''
  const currentPage = Number(params.page) || 1
  const offset = (currentPage - 1) * ITEMS_PER_PAGE

  const searchCondition = query
    ? or(ilike(consumables.name, `%${query}%`), ilike(consumables.sku, `%${query}%`))
    : undefined

  const dataPromise = db
    .select({
      id: consumables.id,
      name: consumables.name,
      sku: consumables.sku,
      categoryId: consumables.categoryId,
      categoryName: categories.name,
      baseUnit: consumables.baseUnit,
      minimumStock: consumables.minimumStock,
      hasExpiry: consumables.hasExpiry,
      description: consumables.description,
    })
    .from(consumables)
    .leftJoin(categories, eq(consumables.categoryId, categories.id))
    .where(searchCondition)
    .limit(ITEMS_PER_PAGE)
    .offset(offset)
    .orderBy(asc(consumables.name))

  const countPromise = db
    .select({ count: sql<number>`count(*)` })
    .from(consumables)
    .where(searchCondition)

  const categoriesPromise = db
    .select({
      id: categories.id,
      name: categories.name,
    })
    .from(categories)
    .orderBy(asc(categories.name))

  const [rawData, countResult, categoriesList] = await Promise.all([
    dataPromise,
    countPromise,
    categoriesPromise,
  ])

  const formattedData = rawData.map((item) => ({
    ...item,
    sku: item.sku || '-',
    categoryId: item.categoryId || '',
    categoryName: item.categoryName || '-',
    description: item.description || '',
    minimumStock: item.minimumStock ?? 0,
    hasExpiry: item.hasExpiry ?? false,
  }))

  const totalItems = Number(countResult[0]?.count || 0)
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Katalog Barang</h1>
          <p className="text-muted-foreground">
            Kelola data referensi barang habis pakai (ATK, Bahan Kimia, dll).
          </p>
        </div>

        <ConsumableDialog mode="create" categories={categoriesList} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <SearchInput placeholder="Cari nama atau SKU..." className="w-full sm:max-w-xs" />
      </div>

      <div className="flex flex-col gap-4">
        <ConsumableList data={formattedData} categories={categoriesList} />

        {totalPages > 1 && <PaginationControls totalPages={totalPages} />}

        {formattedData.length === 0 && query && (
          <div className="text-muted-foreground py-10 text-center">
            Tidak ditemukan barang dengan kata kunci <strong>&quot;{query}&quot;</strong>.
          </div>
        )}
      </div>
    </div>
  )
}
