import { asc, eq } from 'drizzle-orm'
import { Building2, LayoutDashboard } from 'lucide-react'

import { rooms } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

import { RoomFilter } from './_components/room-filter'
import { StockFilter } from './_components/stock-filter'
import { StockTable } from './_components/stock-table'
import { UnitSelector } from './_components/unit-selector'
import { getAllUnits, getRoomStocks } from './actions'

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
    limit?: string
    status?: string
    unitId?: string
    roomId?: string
    sort?: string
    order?: 'asc' | 'desc'
  }>
}

export default async function RoomStocksPage({ searchParams }: PageProps) {
  const session = await requireAuth({
    roles: ['unit_staff', 'unit_admin', 'faculty_admin'],
  })
  const isFacultyAdmin = session.user.role === 'faculty_admin'

  const params = await searchParams
  const query = params.q || ''
  const page = Number(params.page) || 1
  const limit = Number(params.limit) || 10
  const statusFilter = params.status || ''
  const sortCol = params.sort || 'name'
  const sortOrder = params.order || 'asc'

  const targetRoomId = params.roomId

  let targetUnitId = session.user.unitId
  let availableUnits: { id: string; name: string }[] = []

  if (isFacultyAdmin) {
    availableUnits = await getAllUnits()

    if (params.unitId) {
      targetUnitId = params.unitId
    } else if (availableUnits.length > 0) {
      targetUnitId = availableUnits[0].id
    }
  }

  let availableRooms: { id: string; name: string }[] = []

  if (targetUnitId) {
    try {
      availableRooms = await db
        .select({ id: rooms.id, name: rooms.name })
        .from(rooms)
        .where(eq(rooms.unitId, targetUnitId))
        .orderBy(asc(rooms.name))
    } catch (err) {
      console.error('Gagal mengambil daftar ruangan', err)
    }
  }

  let stockResult: Awaited<ReturnType<typeof getRoomStocks>> | null = null
  let errorMessage: string | null = null

  if (targetUnitId) {
    stockResult = await getRoomStocks(
      page,
      limit,
      query,
      statusFilter,
      targetUnitId,
      sortCol,
      sortOrder,
      targetRoomId,
    )
  } else if (isFacultyAdmin && availableUnits.length === 0) {
    errorMessage = 'Belum ada Unit/Jurusan yang terdaftar di Fakultas ini.'
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stok Ruangan</h1>
          <p className="text-muted-foreground">
            {isFacultyAdmin
              ? 'Pantau distribusi bahan habis pakai di seluruh unit fakultas.'
              : 'Kelola ketersediaan stok consumable di unit Anda.'}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {errorMessage || (stockResult && 'error' in stockResult) ? (
          <div className="text-destructive bg-destructive/5 flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
            <LayoutDashboard className="mb-3 h-10 w-10 opacity-20" />
            <p className="font-medium">
              {errorMessage || (stockResult as { error: string }).error}
            </p>
            {isFacultyAdmin && !targetUnitId && (
              <p className="text-muted-foreground mt-1 text-sm">
                Silakan pilih Unit terlebih dahulu.
              </p>
            )}
          </div>
        ) : (
          stockResult &&
          'data' in stockResult && (
            <StockTable
              data={stockResult.data}
              metadata={stockResult.metadata}
              currentSort={{ column: sortCol, direction: sortOrder }}
            >
              {isFacultyAdmin && (
                <UnitSelector units={availableUnits} currentUnitId={targetUnitId ?? undefined} />
              )}

              <div className={!targetUnitId ? 'pointer-events-none opacity-50' : ''}>
                <RoomFilter rooms={availableRooms} currentRoomId={targetRoomId} />
              </div>

              <StockFilter currentFilter={statusFilter} />
            </StockTable>
          )
        )}

        {isFacultyAdmin && !targetUnitId && !errorMessage && (
          <div className="text-muted-foreground flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
            <Building2 className="mb-3 h-10 w-10 opacity-20" />
            <p>Pilih Unit/Jurusan untuk melihat data stok.</p>
          </div>
        )}
      </div>
    </div>
  )
}
