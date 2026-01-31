'use client'

import { useState } from 'react'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { formatDistanceToNow } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  Check,
  CheckCheck,
  CheckCircle2,
  ExternalLink,
  Info,
  MoreHorizontal,
  Settings2,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { DataTablePagination } from '@/components/shared/data-table-pagination'
import { DataTableToolbar } from '@/components/shared/data-table-toolbar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
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

import { deleteNotification, markAllAsRead, markAsRead } from '../actions'

interface NotificationData {
  id: string
  title: string
  message: string
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'
  link: string | null
  isRead: boolean
  createdAt: Date | null
}

interface NotificationTableProps {
  data: NotificationData[]
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

export function NotificationTable({ data, metadata, currentSort }: NotificationTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [isMarkingAll, setIsMarkingAll] = useState(false)

  const [visibleColumns, setVisibleColumns] = useState({
    status: true,
    content: true,
    date: true,
    actions: true,
  })

  const hasUnread = data.some((n) => !n.isRead)

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

  const handleDelete = async () => {
    if (!deletingId) return
    const res = await deleteNotification(deletingId)
    if (res.error) toast.error(res.error)
    else {
      toast.success(res.message)
      router.refresh()
    }
    setDeletingId(null)
  }

  const handleMarkAsRead = async (id: string) => {
    const res = await markAsRead(id)
    if (res.error) toast.error(res.error)
    else {
      router.refresh()
    }
  }

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true)
    const res = await markAllAsRead()
    setIsMarkingAll(false)

    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(res.message)
      router.refresh()
    }
  }

  const handleLinkClick = async (id: string, isRead: boolean) => {
    if (isRead) return
    await markAsRead(id)
    router.refresh()
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'WARNING':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'ERROR':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Info className="h-4 w-4 text-blue-600" />
    }
  }

  return (
    <div className="w-full">
      <div className="bg-card text-card-foreground rounded-md border shadow-sm">
        <DataTableToolbar placeholder="Cari notifikasi..." limit={metadata.itemsPerPage}>
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={!hasUnread || isMarkingAll}
            className="mr-2 ml-auto hidden h-9 px-3 text-xs sm:flex"
          >
            <CheckCheck className="mr-2 h-3.5 w-3.5" />
            Tandai Semua Dibaca
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="hidden h-9 px-3 text-xs sm:flex">
                <Settings2 className="mr-2 h-3.5 w-3.5" />
                Tampilan
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-45">
              <DropdownMenuLabel>Atur Kolom</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={visibleColumns.status}
                onCheckedChange={(checked) =>
                  setVisibleColumns((prev) => ({ ...prev, status: checked }))
                }
              >
                Status
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.content}
                onCheckedChange={(checked) =>
                  setVisibleColumns((prev) => ({ ...prev, content: checked }))
                }
              >
                Konten
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.date}
                onCheckedChange={(checked) =>
                  setVisibleColumns((prev) => ({ ...prev, date: checked }))
                }
              >
                Waktu
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DataTableToolbar>

        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                {visibleColumns.status && <TableHead className="w-25">Status</TableHead>}
                {visibleColumns.content && (
                  <TableHead className="w-[50%]">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('title')}
                      className="hover:bg-muted h-full w-full justify-start px-0 text-xs font-medium uppercase"
                    >
                      Judul & Pesan
                      {currentSort.column === 'title' && (
                        <ArrowUpDown
                          className={`ml-2 h-3 w-3 ${currentSort.direction === 'asc' ? 'rotate-180' : ''}`}
                        />
                      )}
                    </Button>
                  </TableHead>
                )}
                {visibleColumns.date && (
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('createdAt')}
                      className="hover:bg-muted h-full w-full justify-start px-0 text-xs font-medium uppercase"
                    >
                      Waktu
                      {currentSort.column === 'createdAt' && (
                        <ArrowUpDown
                          className={`ml-2 h-3 w-3 ${currentSort.direction === 'asc' ? 'rotate-180' : ''}`}
                        />
                      )}
                    </Button>
                  </TableHead>
                )}
                <TableHead className="w-25 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground h-24 text-center text-sm">
                    Tidak ada notifikasi.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow
                    key={item.id}
                    className={`hover:bg-muted/50 border-b last:border-0 ${!item.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                  >
                    {visibleColumns.status && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(item.type)}
                          {!item.isRead && (
                            <Badge variant="secondary" className="h-5 text-[10px]">
                              Baru
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.content && (
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span
                            className={`text-sm ${!item.isRead ? 'text-foreground font-bold' : 'text-muted-foreground font-medium'}`}
                          >
                            {item.title}
                          </span>
                          <span className="text-muted-foreground line-clamp-2 text-xs">
                            {item.message}
                          </span>
                          {item.link && (
                            <Link
                              href={item.link}
                              onClick={() => handleLinkClick(item.id, item.isRead)}
                              className="mt-1 flex w-fit items-center gap-1 text-xs text-blue-600 hover:underline"
                            >
                              Lihat Detail <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.date && (
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                        {item.createdAt
                          ? formatDistanceToNow(item.createdAt, {
                              addSuffix: true,
                              locale: idLocale,
                            })
                          : '-'}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!item.isRead && (
                            <DropdownMenuItem onClick={() => handleMarkAsRead(item.id)}>
                              <Check className="mr-2 h-4 w-4" /> Tandai Dibaca
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => setDeletingId(item.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Hapus
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <DataTablePagination metadata={metadata} />
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mb-2 flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/20">
                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-500" />
              </div>
              <AlertDialogTitle>Hapus Notifikasi?</AlertDialogTitle>
            </div>
            <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
