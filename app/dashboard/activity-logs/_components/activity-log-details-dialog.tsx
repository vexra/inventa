'use client'

import { format } from 'date-fns'
import { id } from 'date-fns/locale'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

import { LogEntry } from './activity-logs-table'

interface LogDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: LogEntry
}

export function LogDetailsDialog({ open, onOpenChange, data }: LogDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Detail Log Aktivitas</DialogTitle>
          <DialogDescription>
            Tercatat pada{' '}
            {format(new Date(data.createdAt), 'dd MMMM yyyy, HH:mm:ss', { locale: id })}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Aktor:</span>
            <p className="font-medium">
              {data.actorName} ({data.actorEmail})
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Tabel / Record ID:</span>
            <p className="font-medium">
              {data.tableName} / <span className="font-mono text-xs">{data.recordId}</span>
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="bg-muted/30 rounded-md border p-3">
            <h4 className="text-muted-foreground mb-2 text-xs font-bold tracking-wider uppercase">
              Data Lama (Old)
            </h4>
            <ScrollArea className="bg-card h-62.5 w-full rounded-md border p-2">
              {data.oldValues ? (
                <pre className="font-mono text-xs leading-relaxed">
                  {JSON.stringify(data.oldValues, null, 2)}
                </pre>
              ) : (
                <p className="text-muted-foreground text-xs italic">
                  Tidak ada data lama (Creation)
                </p>
              )}
            </ScrollArea>
          </div>

          <div className="bg-muted/30 rounded-md border p-3">
            <h4 className="text-muted-foreground mb-2 text-xs font-bold tracking-wider uppercase">
              Data Baru (New)
            </h4>
            <ScrollArea className="bg-card h-62.5 w-full rounded-md border p-2">
              {data.newValues ? (
                <pre className="font-mono text-xs leading-relaxed">
                  {JSON.stringify(data.newValues, null, 2)}
                </pre>
              ) : (
                <p className="text-muted-foreground text-xs italic">
                  Tidak ada data baru (Deletion)
                </p>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
