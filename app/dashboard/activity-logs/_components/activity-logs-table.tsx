'use client'

import { useState } from 'react'

import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Eye } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  actorImage: string | null
}

interface LogsTableProps {
  data: LogEntry[]
}

export function LogsTable({ data }: LogsTableProps) {
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)

  return (
    <>
      <div className="bg-card rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-50">Waktu</TableHead>
              <TableHead>User (Aktor)</TableHead>
              <TableHead>Aksi</TableHead>
              <TableHead>Entitas</TableHead>
              <TableHead className="text-right">Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-muted-foreground font-medium whitespace-nowrap">
                  {format(new Date(log.createdAt), 'dd MMM yyyy, HH:mm', { locale: id })}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-foreground font-medium">
                      {log.actorName || 'Unknown User'}
                    </span>
                    <span className="text-muted-foreground text-xs">{log.actorEmail}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      'w-20 justify-center font-mono text-xs font-bold',
                      log.action === 'CREATE' &&
                        'border-green-200 bg-green-50 text-green-700 hover:bg-green-100',
                      log.action === 'UPDATE' &&
                        'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
                      log.action === 'DELETE' &&
                        'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
                    )}
                  >
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium capitalize">{log.tableName}</span>
                    <span className="text-muted-foreground font-mono text-[10px]">
                      ID: {log.recordId.substring(0, 8)}...
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedLog(log)}
                    title="Lihat Detail JSON"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedLog && (
        <LogDetailsDialog
          open={!!selectedLog}
          onOpenChange={(open) => !open && setSelectedLog(null)}
          data={selectedLog}
        />
      )}
    </>
  )
}
