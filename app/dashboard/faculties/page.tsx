import { asc, desc, ilike, or, sql } from 'drizzle-orm'

import { faculties } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

import { FacultyDialog } from './_components/faculty-dialog'
import { FacultyTable } from './_components/faculty-table'

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
    limit?: string
    sort?: string
    order?: 'asc' | 'desc'
  }>
}

export default async function FacultiesPage({ searchParams }: PageProps) {
  await requireAuth({
    roles: ['super_admin'],
  })

  const params = await searchParams
  const query = params.q || ''
  const currentPage = Number(params.page) || 1
  const itemsPerPage = Number(params.limit) || 10

  const sortCol = params.sort || 'name'
  const sortOrder = params.order || 'asc'

  const offset = (currentPage - 1) * itemsPerPage

  const searchCondition = query
    ? or(ilike(faculties.name, `%${query}%`), ilike(faculties.description, `%${query}%`))
    : undefined

  const orderColumn = sortCol === 'description' ? faculties.description : faculties.name

  const orderBy = sortOrder === 'desc' ? desc(orderColumn) : asc(orderColumn)

  const dataPromise = db
    .select({
      id: faculties.id,
      name: faculties.name,
      description: faculties.description,
    })
    .from(faculties)
    .where(searchCondition)
    .limit(itemsPerPage)
    .offset(offset)
    .orderBy(orderBy)

  const countPromise = db
    .select({ count: sql<number>`count(*)` })
    .from(faculties)
    .where(searchCondition)

  const [data, countResult] = await Promise.all([dataPromise, countPromise])

  const totalItems = Number(countResult[0]?.count || 0)
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Fakultas</h1>
          <p className="text-muted-foreground">Kelola daftar fakultas induk universitas</p>
        </div>
        <FacultyDialog mode="create" />
      </div>

      <FacultyTable
        data={data}
        metadata={{
          totalItems,
          totalPages,
          currentPage,
          itemsPerPage,
          hasNextPage: currentPage < totalPages,
          hasPrevPage: currentPage > 1,
        }}
        currentSort={{ column: sortCol, direction: sortOrder }}
      />
    </div>
  )
}
