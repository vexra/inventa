import { AlertCircle, Boxes } from 'lucide-react'

import { PaginationControls } from '@/components/shared/pagination-controls'
import { SearchInput } from '@/components/shared/search-input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { requireAuth } from '@/lib/auth-guard'

import { RoomFilter } from './_components/room-filter'
import { UnitStockTable } from './_components/unit-stock-table'
import { getUnitRooms, getUnitStocks } from './actions'

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
    roomId?: string
  }>
}

export default async function UnitStocksPage({ searchParams }: PageProps) {
  await requireAuth({ roles: ['unit_admin'] })

  const params = await searchParams
  const query = params.q || ''
  const roomId = params.roomId
  const page = Number(params.page) || 1
  const limit = 10

  const [stockData, roomsList] = await Promise.all([
    getUnitStocks(page, limit, query, roomId),
    getUnitRooms(),
  ])

  const { data, totalItems, error } = stockData
  const totalPages = Math.ceil(totalItems / limit)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Boxes className="h-8 w-8" />
          Monitoring Stok Ruangan
        </h1>
        <p className="text-muted-foreground">
          Pantau ketersediaan stok di seluruh ruangan dalam Unit Kerja Anda.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gagal Memuat Data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput placeholder="Cari nama barang..." className="w-full sm:max-w-xs" />
        <RoomFilter rooms={roomsList} />
      </div>

      <div className="flex flex-col gap-4">
        <UnitStockTable data={data} />

        {totalPages > 1 && <PaginationControls totalPages={totalPages} />}

        {data.length === 0 && query && (
          <div className="text-muted-foreground py-10 text-center">
            Tidak ditemukan barang dengan kata kunci <strong>&quot;{query}&quot;</strong>.
          </div>
        )}
      </div>
    </div>
  )
}
