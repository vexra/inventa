'use client'

import { useState } from 'react'

import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { User } from 'lucide-react'

import { DataTablePagination } from '@/components/shared/data-table-pagination'
import { DataTableToolbar } from '@/components/shared/data-table-toolbar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface AdjustmentHistory {
  id: string
  deltaQuantity: number
  type: string | null
  reason: string
  createdAt: Date | null
  actorName: string | null
}

interface AdjustmentHistoryTableProps {
  data: AdjustmentHistory[]
  unit: string
  metadata: {
    totalItems: number
    totalPages: number
    currentPage: number
    itemsPerPage: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export function AdjustmentHistoryTable({ data, unit, metadata }: AdjustmentHistoryTableProps) {
  const [visibleColumns, setVisibleColumns] = useState({
    date: true,
    type: true,
    actor: true,
    change: true,
  })

  return (
    <div className="w-full space-y-4">
      <div className="bg-card rounded-md border shadow-sm">
        <DataTableToolbar placeholder="Cari alasan / petugas..." limit={metadata.itemsPerPage}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto hidden h-8 lg:flex">
                Atur Kolom
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-37.5">
              <DropdownMenuLabel>Toggle kolom</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={visibleColumns.date}
                onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, date: c }))}
              >
                Tanggal
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.type}
                onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, type: c }))}
              >
                Tipe & Alasan
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.actor}
                onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, actor: c }))}
              >
                Petugas
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.change}
                onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, change: c }))}
              >
                Perubahan
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DataTableToolbar>

        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                {visibleColumns.date && <TableHead className="w-45">Tanggal</TableHead>}
                {visibleColumns.type && <TableHead>Tipe & Alasan</TableHead>}
                {visibleColumns.actor && <TableHead>Petugas</TableHead>}
                {visibleColumns.change && <TableHead className="text-right">Perubahan</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={Object.values(visibleColumns).filter(Boolean).length}
                    className="text-muted-foreground h-24 text-center"
                  >
                    Tidak ada riwayat penyesuaian yang ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((adj) => (
                  <TableRow key={adj.id}>
                    {visibleColumns.date && (
                      <TableCell className="text-sm whitespace-nowrap">
                        {adj.createdAt
                          ? format(new Date(adj.createdAt), 'dd MMM yyyy, HH:mm', {
                              locale: idLocale,
                            })
                          : '-'}
                      </TableCell>
                    )}
                    {visibleColumns.type && (
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          <Badge variant="secondary" className="w-fit text-[10px] font-normal">
                            {adj.type ? adj.type.replace('_', ' ') : '-'}
                          </Badge>
                          <span className="text-muted-foreground text-sm">{adj.reason}</span>
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.actor && (
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <User className="text-muted-foreground h-3.5 w-3.5" />
                          <span>{adj.actorName || 'System'}</span>
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.change && (
                      <TableCell className="text-right">
                        <span
                          className={`font-mono font-bold ${
                            adj.deltaQuantity > 0
                              ? 'text-green-600'
                              : adj.deltaQuantity < 0
                                ? 'text-red-600'
                                : 'text-muted-foreground'
                          }`}
                        >
                          {adj.deltaQuantity > 0 ? '+' : ''}
                          {adj.deltaQuantity} {unit}
                        </span>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <DataTablePagination metadata={metadata} />
      </div>
    </div>
  )
}
