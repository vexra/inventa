'use client'

import { useState } from 'react'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { ArrowUpDown, Eye, History, Settings2 } from 'lucide-react'

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
import { cn } from '@/lib/utils'

import { LogDetailsDialog } from './activity-log-details-dialog'

export type LogEntry = {
  id: string
  action: string
  tableName: string
  recordId: string
  oldValues: unknown
  newValues: unknown
  createdAt: Date
  actorName: string | null
  actorEmail: string | null
}

interface LogsTableProps {
  data: LogEntry[]
  metadata: any
  currentSort: {
    column: string
    direction: 'asc' | 'desc'
  }
}

function SortableHeader({
  id: columnId,
  label,
  currentSort,
  onSort,
  className,
}: {
  id: string
  label: string
  currentSort: { column: string; direction: 'asc' | 'desc' }
  onSort: (id: string) => void
  className?: string
}) {
  return (
    <TableHead className={cn('h-10 px-0', className)}>
      <Button
        variant="ghost"
        onClick={() => onSort(columnId)}
        className="hover:bg-muted h-full w-full justify-start px-4 text-xs font-medium uppercase"
      >
        {label}
        {currentSort.column === columnId && (
          <ArrowUpDown
            className={cn('ml-2 h-3 w-3', currentSort.direction === 'asc' && 'rotate-180')}
          />
        )}
      </Button>
    </TableHead>
  )
}

export function LogsTable({ data, metadata, currentSort }: LogsTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)

  const [visibleColumns, setVisibleColumns] = useState({
    timestamp: true,
    user: true,
    action: true,
    entity: true,
  })

  const handleSort = (column: string) => {
    const isAsc = currentSort.column === column && currentSort.direction === 'asc'
    const params = new URLSearchParams(searchParams.toString())
    params.set('sort', column)
    params.set('order', isAsc ? 'desc' : 'asc')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="w-full">
      <div className="bg-card text-card-foreground rounded-md border shadow-sm">
        <DataTableToolbar placeholder="Cari aktor atau tabel..." limit={metadata.itemsPerPage}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto hidden h-9 px-3 text-xs sm:flex"
              >
                <Settings2 className="mr-2 h-3.5 w-3.5" />
                Tampilan
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-45">
              <DropdownMenuLabel>Atur Kolom</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={visibleColumns.timestamp}
                onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, timestamp: !!v }))}
              >
                Waktu
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.user}
                onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, user: !!v }))}
              >
                User (Aktor)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.action}
                onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, action: !!v }))}
              >
                Aksi
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.entity}
                onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, entity: !!v }))}
              >
                Entitas
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DataTableToolbar>

        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                {visibleColumns.timestamp && (
                  <SortableHeader
                    id="createdAt"
                    label="Waktu"
                    currentSort={currentSort}
                    onSort={handleSort}
                  />
                )}
                {visibleColumns.user && (
                  <SortableHeader
                    id="actorName"
                    label="User (Aktor)"
                    currentSort={currentSort}
                    onSort={handleSort}
                  />
                )}
                {visibleColumns.action && (
                  <SortableHeader
                    id="action"
                    label="Aksi"
                    currentSort={currentSort}
                    onSort={handleSort}
                  />
                )}
                {visibleColumns.entity && (
                  <SortableHeader
                    id="tableName"
                    label="Entitas"
                    currentSort={currentSort}
                    onSort={handleSort}
                  />
                )}
                <TableHead className="h-10 w-20 px-4 text-right text-xs font-medium uppercase">
                  Detail
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground h-24 text-center text-sm">
                    Tidak ada riwayat aktivitas ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/50 border-b last:border-0">
                    {visibleColumns.timestamp && (
                      <TableCell className="text-muted-foreground px-4 py-3 text-xs font-medium whitespace-nowrap">
                        {format(new Date(log.createdAt), 'dd MMM yyyy, HH:mm', { locale: id })}
                      </TableCell>
                    )}
                    {visibleColumns.user && (
                      <TableCell className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{log.actorName || 'System'}</span>
                          <span className="text-muted-foreground text-[11px]">
                            {log.actorEmail}
                          </span>
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.action && (
                      <TableCell className="px-4 py-3">
                        <Badge
                          variant="secondary"
                          className={cn(
                            'font-mono text-[10px] font-bold shadow-none',
                            log.action === 'CREATE' &&
                              'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
                            log.action === 'UPDATE' &&
                              'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
                            log.action === 'DELETE' &&
                              'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
                          )}
                        >
                          {log.action}
                        </Badge>
                      </TableCell>
                    )}
                    {visibleColumns.entity && (
                      <TableCell className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm capitalize">
                            {log.tableName.replace('_', ' ')}
                          </span>
                          <span className="text-muted-foreground font-mono text-[10px]">
                            ID: {log.recordId.substring(0, 8)}...
                          </span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setSelectedLog(log)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination metadata={metadata} />
      </div>

      {selectedLog && (
        <LogDetailsDialog
          open={!!selectedLog}
          onOpenChange={(open) => !open && setSelectedLog(null)}
          data={selectedLog}
        />
      )}
    </div>
  )
}
