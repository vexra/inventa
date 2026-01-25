import { asc, desc, eq, ilike, or, sql } from 'drizzle-orm'

import { buildings, faculties } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

import { BuildingDialog } from './_components/building-dialog'
import { BuildingTable } from './_components/building-table'
import { getFacultiesOption } from './actions'

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
    limit?: string
    sort?: string
    order?: 'asc' | 'desc'
  }>
}

export default async function BuildingsPage({ searchParams }: PageProps) {
  // 1. Cek Auth (Super Admin & Faculty Admin)
  const session = await requireAuth({
    roles: ['super_admin', 'faculty_admin'],
  })

  // 2. Parse Query Params
  const params = await searchParams
  const query = params.q || ''
  const currentPage = Number(params.page) || 1
  const itemsPerPage = Number(params.limit) || 10
  const sortCol = params.sort || 'name'
  const sortOrder = params.order || 'asc'
  const offset = (currentPage - 1) * itemsPerPage

  // 3. Build Search Condition
  // Cari berdasarkan nama gedung ATAU kode gedung
  let searchCondition = query
    ? or(ilike(buildings.name, `%${query}%`), ilike(buildings.code, `%${query}%`))
    : undefined

  // [FILTER] Jika Faculty Admin, paksa filter hanya gedung fakultas dia
  if (session.user.role === 'faculty_admin') {
    const facultyFilter = eq(buildings.facultyId, session.user.facultyId!)
    searchCondition = searchCondition ? sql`${searchCondition} AND ${facultyFilter}` : facultyFilter
  }

  // 4. Build Sorting
  const orderColumn = sortCol === 'code' ? buildings.code : buildings.name
  const orderBy = sortOrder === 'desc' ? desc(orderColumn) : asc(orderColumn)

  // 5. Fetch Data (Join dengan Faculty Name agar informatif)
  const dataPromise = db
    .select({
      id: buildings.id,
      name: buildings.name,
      code: buildings.code,
      description: buildings.description,
      facultyId: buildings.facultyId,
      facultyName: faculties.name, // Join untuk menampilkan nama fakultas
    })
    .from(buildings)
    .leftJoin(faculties, eq(buildings.facultyId, faculties.id)) // Relasi
    .where(searchCondition)
    .limit(itemsPerPage)
    .offset(offset)
    .orderBy(orderBy)

  const countPromise = db
    .select({ count: sql<number>`count(*)` })
    .from(buildings)
    .where(searchCondition)

  // Ambil juga list fakultas untuk dropdown form Create/Edit
  const facultyOptionsPromise = getFacultiesOption()

  const [data, countResult, facultyOptions] = await Promise.all([
    dataPromise,
    countPromise,
    facultyOptionsPromise,
  ])

  const totalItems = Number(countResult[0]?.count || 0)
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manajemen Gedung</h1>
          <p className="text-muted-foreground">Kelola daftar gedung fisik dan fasilitas</p>
        </div>
        {/* Pass facultyOptions ke Dialog */}
        <BuildingDialog
          mode="create"
          facultyOptions={facultyOptions}
          currentUserFacultyId={
            session.user.role === 'faculty_admin' ? session.user.facultyId : undefined
          }
        />
      </div>

      <BuildingTable
        data={data}
        facultyOptions={facultyOptions} // Kirim juga ke tabel untuk mode Edit
        currentUserFacultyId={
          session.user.role === 'faculty_admin' ? session.user.facultyId : undefined
        }
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
