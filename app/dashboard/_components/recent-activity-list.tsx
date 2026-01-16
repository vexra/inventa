import { Activity, FilePen, FilePlus, Trash2 } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export type LogItem = {
  action: string | null
  tableName: string | null
  createdAt: Date | null
  userName: string | null
}

export const formatTimeAgo = (date: Date | null) => {
  if (!date) return '-'
  const now = new Date()
  const eventDate = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - eventDate.getTime()) / 1000)

  if (diffInSeconds < 0) return 'Baru saja'
  if (diffInSeconds < 60) return `${diffInSeconds} detik lalu`
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit lalu`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam lalu`
  return `${Math.floor(diffInSeconds / 86400)} hari lalu`
}

export function RecentActivityList({ logs }: { logs: LogItem[] }) {
  return (
    <Card className="col-span-1 flex h-full flex-col lg:col-span-3">
      <CardHeader>
        <CardTitle>Aktivitas Terkini</CardTitle>
        <CardDescription>Log sistem real-time.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <div className="space-y-8 pr-2">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Activity className="text-muted-foreground/30 mb-2 h-8 w-8" />
              <p className="text-muted-foreground text-sm">Belum ada aktivitas.</p>
            </div>
          ) : (
            logs.map((log, index) => (
              <div className="flex items-start" key={index}>
                <div className="mt-0.5 mr-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                  {log.action === 'CREATE' || log.action === 'INBOUND_RECEIPT' ? (
                    <FilePlus className="h-4 w-4 text-green-500" />
                  ) : log.action === 'UPDATE' || log.action === 'STOCK_OPNAME' ? (
                    <FilePen className="h-4 w-4 text-blue-500" />
                  ) : log.action === 'DELETE' ? (
                    <Trash2 className="h-4 w-4 text-red-500" />
                  ) : (
                    <Activity className="h-4 w-4 text-slate-500" />
                  )}
                </div>
                <div className="w-full min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm leading-none font-medium">
                      {log.userName || 'System'}
                    </p>
                    <span className="text-muted-foreground text-[10px] whitespace-nowrap">
                      {formatTimeAgo(log.createdAt)}
                    </span>
                  </div>
                  <p className="text-muted-foreground truncate text-xs">
                    <span className="text-foreground font-semibold">{log.action}</span> pada{' '}
                    {log.tableName}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
