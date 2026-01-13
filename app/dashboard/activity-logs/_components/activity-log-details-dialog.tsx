'use client'

import { useMemo } from 'react'

import { format } from 'date-fns'
import { id } from 'date-fns/locale'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

import { LogEntry } from './activity-logs-table'

function JsonViewer({ data }: { data: unknown }) {
  const coloredHtml = useMemo(() => {
    if (data === null || data === undefined) return null

    let json = JSON.stringify(data, null, 2)

    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    return json.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = 'text-orange-600 dark:text-orange-400'

        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'text-blue-600 dark:text-blue-400 font-semibold'
          } else {
            cls = 'text-green-600 dark:text-green-400'
          }
        } else if (/true|false/.test(match)) {
          cls = 'text-red-600 dark:text-red-400 font-semibold'
        } else if (/null/.test(match)) {
          cls = 'text-gray-500 dark:text-gray-400 italic'
        }

        return `<span class="${cls}">${match}</span>`
      },
    )
  }, [data])

  if (!data) {
    return <p className="text-muted-foreground text-xs italic">Tidak ada data</p>
  }

  return (
    <pre
      className="font-mono text-xs leading-relaxed"
      dangerouslySetInnerHTML={{ __html: coloredHtml || '' }}
    />
  )
}

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
            <ScrollArea className="bg-card h-64 w-full rounded-md border">
              <div className="p-4">
                {data.oldValues ? (
                  <JsonViewer data={data.oldValues} />
                ) : (
                  <p className="text-muted-foreground text-xs italic">
                    Tidak ada data lama (Creation)
                  </p>
                )}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>

          <div className="bg-muted/30 rounded-md border p-3">
            <h4 className="text-muted-foreground mb-2 text-xs font-bold tracking-wider uppercase">
              Data Baru (New)
            </h4>
            <ScrollArea className="bg-card h-64 w-full rounded-md border">
              <div className="p-4">
                {data.newValues ? (
                  <JsonViewer data={data.newValues} />
                ) : (
                  <p className="text-muted-foreground text-xs italic">
                    Tidak ada data baru (Deletion)
                  </p>
                )}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
