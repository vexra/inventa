import { asc, desc, eq, ilike, or, sql } from 'drizzle-orm'

import { categories, consumables } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

import { ConsumableDialog } from './_components/consumable-dialog'
import { ConsumableTable } from './_components/consumable-table'

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
    limit?: string
    sort?: string
    order?: 'asc' | 'desc'
  }>
}

export default async function ConsumablesPage({ searchParams }: PageProps) {
  await requireAuth({ roles: ['super_admin', 'warehouse_staff'] })

  const params = await searchParams
  const query = params.q || ''
  const currentPage = Number(params.page) || 1
  const itemsPerPage = Number(params.limit) || 10
  const sortCol = params.sort || 'name'
  const sortOrder = params.order || 'asc'
  const offset = (currentPage - 1) * itemsPerPage

  const searchCondition = query
    ? or(
        ilike(consumables.name, `%${query}%`),
        ilike(consumables.sku, `%${query}%`),
        ilike(categories.name, `%${query}%`),
      )
    : undefined

  let orderColumn
  switch (sortCol) {
    case 'sku':
      orderColumn = consumables.sku
      break
    case 'category':
      orderColumn = categories.name
      break
    case 'minStock':
      orderColumn = consumables.minimumStock
      break
    case 'feature':
      orderColumn = consumables.hasExpiry
      break
    case 'name':
    default:
      orderColumn = consumables.name
      break
  }

  const orderBy = sortOrder === 'desc' ? desc(orderColumn) : asc(orderColumn)

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
    .limit(itemsPerPage)
    .offset(offset)
    .orderBy(orderBy)

  const countPromise = db
    .select({ count: sql<number>`count(*)` })
    .from(consumables)
    .leftJoin(categories, eq(consumables.categoryId, categories.id))
    .where(searchCondition)

  const categoriesPromise = db
    .select({ id: categories.id, name: categories.name })
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
    categoryName: item.categoryName || 'Tanpa Kategori',
    description: item.description || '',
    minimumStock: item.minimumStock ?? 0,
    hasExpiry: item.hasExpiry ?? false,
  }))

  const totalItems = Number(countResult[0]?.count || 0)
  const totalPages = Math.ceil(totalItems / itemsPerPage)

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

      <ConsumableTable
        data={formattedData}
        categories={categoriesList}
        currentSort={{ column: sortCol, direction: sortOrder }}
        metadata={{
          totalItems,
          totalPages,
          currentPage,
          itemsPerPage,
          hasNextPage: currentPage < totalPages,
          hasPrevPage: currentPage > 1,
        }}
      />

      {formattedData.length === 0 && query && (
        <div className="py-10 text-center">
          <p className="text-muted-foreground">
            Tidak ditemukan barang dengan kata kunci <strong>&quot;{query}&quot;</strong>.
          </p>
        </div>
      )}
    </div>
  )
}
