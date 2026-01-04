import { and, asc, eq, ilike, isNull, or, sql } from 'drizzle-orm'

import { categories, items } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

import { ItemDialog } from './_components/item-dialog'
import { ItemList } from './_components/item-list'
import { ItemPagination } from './_components/item-pagination'
import { ItemSearch } from './_components/item-search'

const ITEMS_PER_PAGE = 10

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
  }>
}

export default async function ItemsPage({ searchParams }: PageProps) {
  await requireAuth({
    roles: ['administrator', 'warehouse_staff'],
  })

  const params = await searchParams
  const query = params.q || ''
  const currentPage = Number(params.page) || 1
  const offset = (currentPage - 1) * ITEMS_PER_PAGE

  const searchCondition = and(
    query ? or(ilike(items.name, `%${query}%`), ilike(items.sku, `%${query}%`)) : undefined,
    isNull(items.deletedAt),
  )

  const dataPromise = db
    .select({
      id: items.id,
      name: items.name,
      sku: items.sku,
      baseUnit: items.baseUnit,
      minStockAlert: items.minStockAlert,
      description: items.description,
      hasExpiry: items.hasExpiry,
      isActive: items.isActive,
      categoryId: items.categoryId,
      categoryName: categories.name,
    })
    .from(items)
    .leftJoin(categories, eq(items.categoryId, categories.id))
    .where(searchCondition)
    .limit(ITEMS_PER_PAGE)
    .offset(offset)
    .orderBy(asc(items.name))

  const countPromise = db
    .select({ count: sql<number>`count(*)` })
    .from(items)
    .where(searchCondition)

  const categoriesPromise = db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .orderBy(asc(categories.name))

  const [data, countResult, categoriesData] = await Promise.all([
    dataPromise,
    countPromise,
    categoriesPromise,
  ])

  const totalItems = Number(countResult[0]?.count || 0)
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)

  const formattedData = data.map((item) => ({
    ...item,
    categoryName: item.categoryName || 'Tanpa Kategori',
  }))

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Barang</h1>
          <p className="text-muted-foreground">Katalog utama barang habis pakai</p>
        </div>
        <ItemDialog mode="create" categories={categoriesData} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <ItemSearch />
      </div>

      <div className="flex flex-col gap-4">
        <ItemList data={formattedData} categories={categoriesData} />

        {totalPages > 1 && <ItemPagination totalPages={totalPages} />}

        {data.length === 0 && query && (
          <div className="text-muted-foreground py-10 text-center">
            Tidak ditemukan barang dengan kata kunci <strong>&quot;{query}&quot;</strong>.
          </div>
        )}
      </div>
    </div>
  )
}
