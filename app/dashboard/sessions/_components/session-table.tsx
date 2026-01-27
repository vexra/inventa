'use client'

import { useState } from 'react'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { ArrowUpDown, Settings2, Shield } from 'lucide-react'

import { DataTablePagination } from '@/components/shared/data-table-pagination'
import { DataTableToolbar } from '@/components/shared/data-table-toolbar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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

import { SessionSheet } from './session-sheet'

interface SessionUser {
  id: string
  name: string
  email: string
  role: string
  image: string | null
}

interface SessionTableProps {
  data: SessionUser[]
  metadata: {
    totalItems: number
    totalPages: number
    currentPage: number
    itemsPerPage: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
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

export function SessionTable({ data, metadata, currentSort }: SessionTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [visibleColumns, setVisibleColumns] = useState({
    user: true,
    role: true,
    actions: true,
  })

  const createQueryString = (params: Record<string, string | number | null>) => {
    const newParams = new URLSearchParams(searchParams.toString())
    Object.entries(params).forEach(([key, value]) => {
      if (value === null) newParams.delete(key)
      else newParams.set(key, String(value))
    })
    return newParams.toString()
  }

  const handleSort = (column: string) => {
    const isAsc = currentSort.column === column && currentSort.direction === 'asc'
    router.push(
      `${pathname}?${createQueryString({
        sort: column,
        order: isAsc ? 'desc' : 'asc',
      })}`,
      { scroll: false },
    )
  }

  return (
    <div className="w-full">
      <div className="bg-card text-card-foreground rounded-md border shadow-sm">
        <DataTableToolbar placeholder="Cari pengguna..." limit={metadata.itemsPerPage}>
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
                checked={visibleColumns.user}
                onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, user: !!v }))}
              >
                Pengguna
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.role}
                onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, role: !!v }))}
              >
                Role
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DataTableToolbar>

        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                {visibleColumns.user && (
                  <SortableHeader
                    id="name"
                    label="Pengguna"
                    currentSort={currentSort}
                    onSort={handleSort}
                    className="w-[50%]"
                  />
                )}
                {visibleColumns.role && (
                  <SortableHeader
                    id="role"
                    label="Role"
                    currentSort={currentSort}
                    onSort={handleSort}
                  />
                )}
                <TableHead className="h-10 w-32 px-4 text-right text-xs font-medium uppercase">
                  Aksi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground h-24 text-center text-sm">
                    Tidak ada pengguna ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((u) => (
                  <TableRow key={u.id} className="hover:bg-muted/50 border-b last:border-0">
                    {visibleColumns.user && (
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={u.image || ''} />
                            <AvatarFallback>
                              {u.name?.substring(0, 2).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{u.name}</span>
                            <span className="text-muted-foreground text-[11px]">{u.email}</span>
                          </div>
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.role && (
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Shield className="text-muted-foreground h-3.5 w-3.5" />
                          <Badge
                            variant="secondary"
                            className="bg-muted text-muted-foreground hover:bg-muted font-normal capitalize"
                          >
                            {u.role.replace('_', ' ')}
                          </Badge>
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="px-4 py-3 text-right">
                      <SessionSheet userId={u.id} userName={u.name} />
                    </TableCell>
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
