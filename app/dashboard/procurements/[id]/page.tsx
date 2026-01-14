import Link from 'next/link'
import { notFound } from 'next/navigation'

import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { desc, eq } from 'drizzle-orm'
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Package,
  Timer,
  Truck,
  User,
  XCircle,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  consumables,
  procurementConsumables,
  procurementStatusEnum,
  procurementTimelines,
  procurements,
  user,
} from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

type ProcurementStatus = (typeof procurementStatusEnum.enumValues)[number]

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProcurementDetailPage({ params }: PageProps) {
  await requireAuth({ roles: ['warehouse_staff'] })

  const { id } = await params

  const [procurement] = await db
    .select({
      id: procurements.id,
      code: procurements.procurementCode,
      status: procurements.status,
      requestDate: procurements.createdAt,
      notes: procurements.notes,
      requesterName: user.name,
      requesterEmail: user.email,
      requesterRole: user.role,
    })
    .from(procurements)
    .leftJoin(user, eq(procurements.userId, user.id))
    .where(eq(procurements.id, id))
    .limit(1)

  if (!procurement) {
    notFound()
  }

  const items = await db
    .select({
      id: procurementConsumables.id,
      quantity: procurementConsumables.quantity,
      consumableName: consumables.name,
      unit: consumables.baseUnit,
    })
    .from(procurementConsumables)
    .leftJoin(consumables, eq(procurementConsumables.consumableId, consumables.id))
    .where(eq(procurementConsumables.procurementId, id))

  const timelines = await db
    .select({
      id: procurementTimelines.id,
      status: procurementTimelines.status,
      notes: procurementTimelines.notes,
      createdAt: procurementTimelines.createdAt,
      actorName: user.name,
    })
    .from(procurementTimelines)
    .leftJoin(user, eq(procurementTimelines.actorId, user.id))
    .where(eq(procurementTimelines.procurementId, id))
    .orderBy(desc(procurementTimelines.createdAt))

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/procurements">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Detail Pengajuan</h1>
            <StatusBadge status={procurement.status as ProcurementStatus} />
          </div>
          <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
            <span className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono">
              {procurement.code}
            </span>
            <span>•</span>
            <span>
              {procurement.requestDate
                ? format(new Date(procurement.requestDate), 'dd MMMM yyyy, HH:mm', {
                    locale: idLocale,
                  })
                : '-'}
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-blue-600" />
                Informasi Dasar
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-1">
                <div className="text-muted-foreground mb-1 flex items-center gap-2 text-sm">
                  <User className="h-4 w-4" /> Pemohon (Requester)
                </div>
                <div className="font-medium">{procurement.requesterName}</div>
                <div className="text-muted-foreground text-xs capitalize">
                  {procurement.requesterRole?.replace('_', ' ')}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-muted-foreground mb-1 flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" /> Tanggal Pengajuan
                </div>
                <div className="font-medium">
                  {procurement.requestDate
                    ? format(new Date(procurement.requestDate), 'dd MMMM yyyy', {
                        locale: idLocale,
                      })
                    : '-'}
                </div>
              </div>

              <div className="space-y-1 rounded-md border border-dashed bg-slate-50 p-4 sm:col-span-2 dark:bg-slate-900">
                <div className="text-muted-foreground mb-1 text-sm font-medium">
                  Catatan / Keperluan:
                </div>
                <p className="text-sm">
                  {procurement.notes || (
                    <span className="text-muted-foreground italic">Tidak ada catatan.</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5 text-blue-600" />
                Daftar Barang ({items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Nama Barang</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="w-24">Satuan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground text-center">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">{item.consumableName}</TableCell>
                      <TableCell className="text-right font-mono text-base">
                        {Number(item.quantity)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{item.unit}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-1">
          <Card className="flex h-full max-h-[calc(100vh-8rem)] flex-col">
            <CardHeader className="shrink-0">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-blue-600" />
                Timeline Aktivitas
              </CardTitle>
            </CardHeader>

            <CardContent className="overflow-y-auto pr-2">
              <div className="border-muted relative ml-3 space-y-8 border-l pb-1 pl-6">
                {timelines.map((log, index) => {
                  const isLatest = index === 0
                  return (
                    <div key={log.id} className="relative">
                      <div
                        className={`ring-background absolute top-1 -left-7.25 h-2.5 w-2.5 rounded-full border ring-4 ${
                          isLatest
                            ? 'border-blue-600 bg-blue-600'
                            : 'bg-muted-foreground/30 border-muted-foreground/30'
                        }`}
                      />

                      <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground text-xs">
                          {log.createdAt
                            ? format(new Date(log.createdAt), 'dd MMM yyyy, HH:mm', {
                                locale: idLocale,
                              })
                            : '-'}
                        </span>

                        <div className="text-sm font-medium">
                          <span className={isLatest ? 'text-foreground font-bold' : 'font-medium'}>
                            {STATUS_LABEL_MAP[log.status as ProcurementStatus] || log.status}
                          </span>
                        </div>

                        {log.notes && (
                          <p className="text-muted-foreground bg-muted/50 mt-1 rounded p-2 text-sm">
                            &quot;{log.notes}&quot;
                          </p>
                        )}

                        <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
                          <User className="h-3 w-3" />
                          <span>{log.actorName || 'System'}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

const STATUS_LABEL_MAP: Record<ProcurementStatus, string> = {
  PENDING: 'Menunggu Persetujuan',
  APPROVED: 'Disetujui Anggaran',
  REJECTED: 'Ditolak',
  COMPLETED: 'Selesai / Diterima Gudang',
}

function StatusBadge({ status }: { status: ProcurementStatus | string | null }) {
  const normalizedStatus = (status || 'PENDING') as ProcurementStatus

  const styles: Record<ProcurementStatus, string> = {
    PENDING:
      'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
    APPROVED:
      'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    REJECTED:
      'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    COMPLETED:
      'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  }

  const icons: Record<ProcurementStatus, React.ElementType> = {
    PENDING: Timer,
    APPROVED: CheckCircle2,
    REJECTED: XCircle,
    COMPLETED: Truck,
  }

  const Icon = icons[normalizedStatus] || AlertCircle

  return (
    <Badge
      variant="outline"
      className={`gap-1.5 py-1 pr-2.5 pl-1.5 text-sm font-normal capitalize ${styles[normalizedStatus]}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {STATUS_LABEL_MAP[normalizedStatus] || normalizedStatus}
    </Badge>
  )
}
