import { asc, eq, ilike, or, sql } from 'drizzle-orm'

import { PaginationControls } from '@/components/shared/pagination-controls'
import { SearchInput } from '@/components/shared/search-input'
import { faculties, units } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

import { UnitDialog } from './_components/unit-dialog'
import { UnitList } from './_components/unit-list'

const ITEMS_PER_PAGE = 10

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
  }>
}

export default async function UnitsPage({ searchParams }: PageProps) {
  await requireAuth({ roles: ['super_admin'] })

  const params = await searchParams
  const query = params.q || ''
  const currentPage = Number(params.page) || 1
  const offset = (currentPage - 1) * ITEMS_PER_PAGE

  const searchCondition = query
    ? or(ilike(units.name, `%${query}%`), ilike(units.description, `%${query}%`))
    : undefined

  const dataPromise = db
    .select({
      id: units.id,
      name: units.name,
      description: units.description,
      facultyId: units.facultyId,
      facultyName: faculties.name,
    })
    .from(units)
    .leftJoin(faculties, eq(units.facultyId, faculties.id))
    .where(searchCondition)
    .limit(ITEMS_PER_PAGE)
    .offset(offset)
    .orderBy(asc(units.name))

  const countPromise = db
    .select({ count: sql<number>`count(*)` })
    .from(units)
    .where(searchCondition)

  const facultiesPromise = db
    .select({
      id: faculties.id,
      name: faculties.name,
    })
    .from(faculties)
    .orderBy(asc(faculties.name))

  const [data, countResult, facultiesList] = await Promise.all([
    dataPromise,
    countPromise,
    facultiesPromise,
  ])

  const totalItems = Number(countResult[0]?.count || 0)
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Unit</h1>
          <p className="text-muted-foreground">Kelola daftar unit kerja dan departemen</p>
        </div>

        <UnitDialog mode="create" faculties={facultiesList} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <SearchInput placeholder="Cari nama unit..." className="w-full sm:max-w-xs" />
      </div>

      <div className="flex flex-col gap-4">
        <UnitList data={data} faculties={facultiesList} />

        {totalPages > 1 && <PaginationControls totalPages={totalPages} />}

        {data.length === 0 && query && (
          <div className="text-muted-foreground py-10 text-center">
            Tidak ditemukan unit dengan kata kunci <strong>&quot;{query}&quot;</strong>.
          </div>
        )}
      </div>
    </div>
  )
}
