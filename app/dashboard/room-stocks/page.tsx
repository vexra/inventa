import { AlertCircle } from 'lucide-react'

import { PaginationControls } from '@/components/shared/pagination-controls'
import { SearchInput } from '@/components/shared/search-input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { requireAuth } from '@/lib/auth-guard'

import { StockTable } from './_components/stock-table'
import { getRoomStocks } from './actions'

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
  }>
}

export default async function RoomStocksPage({ searchParams }: PageProps) {
  await requireAuth({ roles: ['unit_staff'] })

  const params = await searchParams
  const query = params.q || ''
  const page = Number(params.page) || 1
  const limit = 10

  const { data, totalItems, roomName, error } = await getRoomStocks(page, limit, query)
  const totalPages = Math.ceil(totalItems / limit)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stok Ruangan</h1>
        <p className="text-muted-foreground">
          Inventaris barang habis pakai yang tersedia di{' '}
          <span className="text-foreground font-semibold">{roomName || 'Ruangan Anda'}</span>.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gagal Memuat Data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mt-4 flex items-center justify-between gap-2">
        <SearchInput placeholder="Cari nama barang..." className="w-full sm:max-w-xs" />
      </div>

      <div className="flex flex-col gap-4">
        <StockTable data={data} />

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
