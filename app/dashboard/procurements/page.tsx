import { asc } from 'drizzle-orm'

import { PaginationControls } from '@/components/shared/pagination-controls'
import { SearchInput } from '@/components/shared/search-input'
import { consumables } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

import { ProcurementDialog } from './_components/procurement-dialog'
import { ProcurementTable } from './_components/procurement-table'
import { getProcurements } from './actions'

const ITEMS_PER_PAGE = 10

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
  }>
}

type ProcurementItemDetail = {
  id: string
  consumableId: string
  quantity: string
  unit: string | null
  consumableName: string | null
  hasExpiry: boolean | null
}

export default async function ProcurementPage({ searchParams }: PageProps) {
  const session = await requireAuth({
    roles: ['warehouse_staff', 'super_admin', 'faculty_admin'],
  })

  const userRole = session.user.role || ''

  const params = await searchParams
  const query = params.q || ''
  const currentPage = Number(params.page) || 1

  const { data, totalItems } = await getProcurements(currentPage, ITEMS_PER_PAGE, query)

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)

  const consumablesList = await db
    .select({
      id: consumables.id,
      name: consumables.name,
      unit: consumables.baseUnit,
      hasExpiry: consumables.hasExpiry,
    })
    .from(consumables)
    .orderBy(asc(consumables.name))

  const formattedData = data.map((procurement) => ({
    ...procurement,
    items: procurement.items.map((item: ProcurementItemDetail) => ({
      id: item.id,
      consumableId: item.consumableId,
      quantity: item.quantity,
      unit: item.unit,
      consumable: {
        name: item.consumableName || 'Unknown Item',
        hasExpiry: item.hasExpiry ?? false,
      },
    })),
  }))

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pengadaan Barang</h1>
          <p className="text-muted-foreground">Kelola pengajuan restock barang habis pakai.</p>
        </div>

        {(userRole === 'warehouse_staff' || userRole === 'super_admin') && (
          <ProcurementDialog consumables={consumablesList} />
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <SearchInput
          placeholder="Cari No. PO atau Nama Pemohon..."
          className="w-full sm:max-w-xs"
        />
      </div>

      <div className="flex flex-col gap-4">
        <ProcurementTable data={formattedData} consumables={consumablesList} userRole={userRole} />

        {totalPages > 1 && <PaginationControls totalPages={totalPages} />}

        {data.length === 0 && query && (
          <div className="text-muted-foreground py-10 text-center">
            Tidak ditemukan pengajuan dengan kata kunci <strong>&quot;{query}&quot;</strong>.
          </div>
        )}
      </div>
    </div>
  )
}
