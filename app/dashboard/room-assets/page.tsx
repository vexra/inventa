import { asc, eq } from 'drizzle-orm'
import { LayoutDashboard, Monitor } from 'lucide-react'

import { rooms } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

import { AssetTable } from './_components/asset-table'
import { RoomFilter } from './_components/room-filter'
import { StatusFilter } from './_components/status-filter'
import { getRoomAssets } from './actions'

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
    limit?: string
    status?: string
    roomId?: string
    sort?: string
    order?: 'asc' | 'desc'
  }>
}

export default async function RoomAssetsPage({ searchParams }: PageProps) {
  const session = await requireAuth({
    roles: ['unit_staff', 'unit_admin'],
  })

  const userUnitId = session.user.unitId

  const params = await searchParams
  const query = params.q || ''
  const page = Number(params.page) || 1
  const limit = Number(params.limit) || 10
  const statusFilter = params.status || ''
  const sortCol = params.sort || 'name'
  const sortOrder = params.order || 'asc'
  const targetRoomId = params.roomId

  // Get available rooms for the user's unit
  let availableRooms: { id: string; name: string }[] = []

  if (userUnitId) {
    try {
      availableRooms = await db
        .select({ id: rooms.id, name: rooms.name })
        .from(rooms)
        .where(eq(rooms.unitId, userUnitId))
        .orderBy(asc(rooms.name))
    } catch (err) {
      console.error('Gagal mengambil daftar ruangan', err)
    }
  }

  let assetResult: Awaited<ReturnType<typeof getRoomAssets>> | null = null
  let errorMessage: string | null = null

  if (!userUnitId) {
    errorMessage = 'Akun Anda tidak terhubung dengan Unit manapun.'
  } else if (availableRooms.length === 0) {
    errorMessage = 'Unit Anda belum memiliki ruangan yang terdaftar.'
  } else {
    assetResult = await getRoomAssets(
      page,
      limit,
      query,
      statusFilter,
      targetRoomId,
      sortCol,
      sortOrder,
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aset Ruangan</h1>
          <p className="text-muted-foreground">
            Kelola dan pantau aset di ruangan unit Anda.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {errorMessage ? (
          <div className="text-destructive bg-destructive/5 flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
            <LayoutDashboard className="mb-3 h-10 w-10 opacity-20" />
            <p className="font-medium">{errorMessage}</p>
          </div>
        ) : assetResult && 'error' in assetResult ? (
          <div className="text-destructive bg-destructive/5 flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
            <Monitor className="mb-3 h-10 w-10 opacity-20" />
            <p className="font-medium">{assetResult.error}</p>
          </div>
        ) : (
          assetResult &&
          'data' in assetResult && (
            <AssetTable
              data={assetResult.data}
              metadata={assetResult.metadata}
              currentSort={{ column: sortCol, direction: sortOrder }}
            >
              <RoomFilter rooms={availableRooms} currentRoomId={targetRoomId} />

              <StatusFilter currentFilter={statusFilter} />
            </AssetTable>
          )
        )}
      </div>
    </div>
  )
}
