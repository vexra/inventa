import { and, asc, eq, ilike, or, sql } from 'drizzle-orm'

import { PaginationControls } from '@/components/shared/pagination-controls'
import { SearchInput } from '@/components/shared/search-input'
import { rooms, units } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

import { RoomDialog } from './_components/room-dialog'
import { RoomList } from './_components/room-list'

const ITEMS_PER_PAGE = 10

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
  }>
}

export default async function RoomsPage({ searchParams }: PageProps) {
  // 1. Ambil session user
  const session = await requireAuth({
    roles: ['super_admin', 'unit_admin'],
  })

  const userRole = session.user.role
  const userUnitId = session.user.unitId
  const isSuperAdmin = userRole === 'super_admin'

  const params = await searchParams
  const query = params.q || ''
  const currentPage = Number(params.page) || 1
  const offset = (currentPage - 1) * ITEMS_PER_PAGE

  // 2. Base Filter (Pencarian Text)
  const textSearch = query
    ? or(
        ilike(rooms.name, `%${query}%`),
        ilike(rooms.description, `%${query}%`),
        ilike(units.name, `%${query}%`),
      )
    : undefined

  // 3. Role Filter (Penting!)
  // Jika bukan Super Admin, WAJIB filter berdasarkan unitId user tersebut
  const roleFilter = !isSuperAdmin && userUnitId ? eq(rooms.unitId, userUnitId) : undefined

  // Gabungkan filter dengan operator AND
  const finalCondition = and(textSearch, roleFilter)

  // 4. Query Data Rooms
  const dataPromise = db
    .select({
      id: rooms.id,
      name: rooms.name,
      description: rooms.description,
      type: rooms.type,
      qrToken: rooms.qrToken,
      unitId: rooms.unitId,
      unitName: units.name,
    })
    .from(rooms)
    .leftJoin(units, eq(rooms.unitId, units.id))
    .where(finalCondition)
    .limit(ITEMS_PER_PAGE)
    .offset(offset)
    .orderBy(asc(rooms.name))

  const countPromise = db
    .select({ count: sql<number>`count(*)` })
    .from(rooms)
    .leftJoin(units, eq(rooms.unitId, units.id))
    .where(finalCondition)

  // 5. Query Opsi Units untuk Dialog
  // Jika Unit Admin, opsi unit di dropdown create/edit HANYA unit dia sendiri
  const unitsCondition = !isSuperAdmin && userUnitId ? eq(units.id, userUnitId) : undefined

  const unitsPromise = db
    .select({
      id: units.id,
      name: units.name,
    })
    .from(units)
    .where(unitsCondition)
    .orderBy(asc(units.name))

  const [data, countResult, unitsList] = await Promise.all([
    dataPromise,
    countPromise,
    unitsPromise,
  ])

  const totalItems = Number(countResult[0]?.count || 0)
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Ruangan</h1>
          <p className="text-muted-foreground">
            Kelola daftar ruangan, laboratorium, dan kantor unit.
          </p>
        </div>

        {/* Kirim unitsList yang sudah difilter ke Dialog */}
        <RoomDialog mode="create" units={unitsList} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <SearchInput placeholder="Cari ruangan..." className="w-full sm:max-w-xs" />
      </div>

      <div className="flex flex-col gap-4">
        {/* Pass prop isSuperAdmin ke List */}
        <RoomList data={data} units={unitsList} isSuperAdmin={isSuperAdmin} />

        {totalPages > 1 && <PaginationControls totalPages={totalPages} />}

        {data.length === 0 && query && (
          <div className="text-muted-foreground py-10 text-center">
            Tidak ditemukan ruangan dengan kata kunci <strong>&quot;{query}&quot;</strong>.
          </div>
        )}
      </div>
    </div>
  )
}
