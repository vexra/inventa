import { asc, ilike, sql } from 'drizzle-orm'

import { PaginationControls } from '@/components/shared/pagination-controls'
import { SearchInput } from '@/components/shared/search-input'
import { categories } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

import { CategoryDialog } from './_components/category-dialog'
import { CategoryList } from './_components/category-list'

const ITEMS_PER_PAGE = 10

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
  }>
}

export default async function CategoriesPage({ searchParams }: PageProps) {
  await requireAuth({
    roles: ['super_admin'],
  })

  const params = await searchParams
  const query = params.q || ''
  const currentPage = Number(params.page) || 1
  const offset = (currentPage - 1) * ITEMS_PER_PAGE

  const searchCondition = query ? ilike(categories.name, `%${query}%`) : undefined

  const dataPromise = db
    .select()
    .from(categories)
    .where(searchCondition)
    .limit(ITEMS_PER_PAGE)
    .offset(offset)
    .orderBy(asc(categories.name))

  const countPromise = db
    .select({ count: sql<number>`count(*)` })
    .from(categories)
    .where(searchCondition)

  const [data, countResult] = await Promise.all([dataPromise, countPromise])

  const totalItems = Number(countResult[0]?.count || 0)
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kategori</h1>
          <p className="text-muted-foreground">Kelola kategori untuk pengelompokan jenis barang</p>
        </div>
        <CategoryDialog mode="create" />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <SearchInput placeholder="Cari kategori..." className="w-full sm:max-w-xs" />
      </div>

      <div className="flex flex-col gap-4">
        <CategoryList data={data} />

        {totalPages > 1 && <PaginationControls totalPages={totalPages} />}

        {data.length === 0 && query && (
          <div className="text-muted-foreground py-10 text-center">
            Tidak ditemukan kategori dengan kata kunci <strong>&quot;{query}&quot;</strong>.
          </div>
        )}
      </div>
    </div>
  )
}
