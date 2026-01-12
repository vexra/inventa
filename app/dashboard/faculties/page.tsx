import { asc, ilike, or, sql } from 'drizzle-orm'

import { PaginationControls } from '@/components/shared/pagination-controls'
import { SearchInput } from '@/components/shared/search-input'
import { faculties } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

import { FacultyDialog } from './_components/faculty-dialog'
import { FacultyList } from './_components/faculty-list'

const ITEMS_PER_PAGE = 10

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
  }>
}

export default async function FacultiesPage({ searchParams }: PageProps) {
  await requireAuth({
    roles: ['super_admin'],
  })

  const params = await searchParams
  const query = params.q || ''
  const currentPage = Number(params.page) || 1
  const offset = (currentPage - 1) * ITEMS_PER_PAGE

  const searchCondition = query
    ? or(ilike(faculties.name, `%${query}%`), ilike(faculties.description, `%${query}%`))
    : undefined

  const dataPromise = db
    .select({
      id: faculties.id,
      name: faculties.name,
      description: faculties.description,
    })
    .from(faculties)
    .where(searchCondition)
    .limit(ITEMS_PER_PAGE)
    .offset(offset)
    .orderBy(asc(faculties.name))

  const countPromise = db
    .select({ count: sql<number>`count(*)` })
    .from(faculties)
    .where(searchCondition)

  const [data, countResult] = await Promise.all([dataPromise, countPromise])

  const totalItems = Number(countResult[0]?.count || 0)
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Fakultas</h1>
          <p className="text-muted-foreground">Kelola daftar fakultas induk universitas</p>
        </div>

        <FacultyDialog mode="create" />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <SearchInput placeholder="Cari nama fakultas..." className="w-full sm:max-w-xs" />
      </div>

      <div className="flex flex-col gap-4">
        <FacultyList data={data} />

        {totalPages > 1 && <PaginationControls totalPages={totalPages} />}

        {data.length === 0 && query && (
          <div className="text-muted-foreground py-10 text-center">
            Tidak ditemukan fakultas dengan kata kunci <strong>&quot;{query}&quot;</strong>.
          </div>
        )}
      </div>
    </div>
  )
}
