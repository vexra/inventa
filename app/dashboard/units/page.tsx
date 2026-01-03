import { asc, ilike, or, sql } from 'drizzle-orm'

import { units } from '@/db/schema'
import { db } from '@/lib/db'

import { UnitDialog } from './_components/unit-dialog'
import { UnitList } from './_components/unit-list'
import { UnitPagination } from './_components/unit-pagination'
import { UnitSearch } from './_components/unit-search'

const ITEMS_PER_PAGE = 10

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
  }>
}

export default async function UnitsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const query = params.q || ''
  const currentPage = Number(params.page) || 1
  const offset = (currentPage - 1) * ITEMS_PER_PAGE

  const searchCondition = query
    ? or(ilike(units.name, `%${query}%`), ilike(units.description, `%${query}%`))
    : undefined

  const dataPromise = db
    .select()
    .from(units)
    .where(searchCondition)
    .limit(ITEMS_PER_PAGE)
    .offset(offset)
    .orderBy(asc(units.name))

  const countPromise = db
    .select({ count: sql<number>`count(*)` })
    .from(units)
    .where(searchCondition)

  const [data, countResult] = await Promise.all([dataPromise, countPromise])

  const totalItems = Number(countResult[0]?.count || 0)
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Unit</h1>
          <p className="text-muted-foreground">Kelola daftar unit kerja dan departemen</p>
        </div>
        <UnitDialog mode="create" />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <UnitSearch />
      </div>

      <div className="flex flex-col gap-4">
        <UnitList data={data} />

        {totalPages > 1 && <UnitPagination totalPages={totalPages} />}

        {data.length === 0 && query && (
          <div className="text-muted-foreground py-10 text-center">
            Tidak ditemukan unit dengan kata kunci <strong>&quot;{query}&quot;</strong>.
          </div>
        )}
      </div>
    </div>
  )
}
