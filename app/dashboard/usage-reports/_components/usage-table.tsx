'use client'

import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { Calendar, ClipboardList } from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// PERBAIKAN: Sesuaikan Interface dengan return data dari actions.ts
interface UsageReportData {
  id: string
  activityName: string
  createdAt: Date | null
  itemCount: number
}

interface UsageTableProps {
  data: UsageReportData[]
}

export function UsageTable({ data }: UsageTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-50">Tanggal</TableHead>
            <TableHead>Nama Kegiatan</TableHead>
            <TableHead className="text-right">Jumlah Item</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-muted-foreground h-24 text-center">
                Belum ada laporan pemakaian.
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Calendar className="text-muted-foreground h-4 w-4" />
                    <span>
                      {item.createdAt
                        ? format(new Date(item.createdAt), 'dd MMM yyyy', { locale: idLocale })
                        : '-'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 font-medium">
                    <ClipboardList className="text-muted-foreground h-4 w-4" />
                    {item.activityName}
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">{item.itemCount} Barang</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
