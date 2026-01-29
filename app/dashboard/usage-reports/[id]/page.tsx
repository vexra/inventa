import Link from 'next/link'
import { notFound } from 'next/navigation'

import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { eq } from 'drizzle-orm'
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  History,
  MapPin,
  Package,
  User,
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
import { consumables, rooms, usageDetails, usageReports, user } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function UsageReportDetailPage({ params }: PageProps) {
  await requireAuth({ roles: ['unit_staff', 'unit_admin', 'super_admin'] })

  const { id } = await params

  const [report] = await db
    .select({
      id: usageReports.id,
      activityName: usageReports.activityName,
      activityDate: usageReports.activityDate,
      createdAt: usageReports.createdAt,
      userId: usageReports.userId,
      roomId: usageReports.roomId,

      reporterName: user.name,
      reporterEmail: user.email,
      reporterRole: user.role,
      roomName: rooms.name,
    })
    .from(usageReports)
    .leftJoin(user, eq(usageReports.userId, user.id))
    .leftJoin(rooms, eq(usageReports.roomId, rooms.id))
    .where(eq(usageReports.id, id))
    .limit(1)

  if (!report) {
    notFound()
  }

  const details = await db
    .select({
      id: usageDetails.id,
      quantity: usageDetails.qtyUsed,
      batchNumber: usageDetails.batchNumber,

      consumableName: consumables.name,
      unit: consumables.baseUnit,
    })
    .from(usageDetails)
    .leftJoin(consumables, eq(usageDetails.consumableId, consumables.id))
    .where(eq(usageDetails.reportId, id))

  const timelineEvent = {
    status: 'SUBMITTED',
    createdAt: report.createdAt,
    actorName: report.reporterName,
    notes: 'Laporan pemakaian berhasil dibuat',
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* --- HEADER --- */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/usage-reports">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {report.activityName || 'Detail Laporan'}
            </h1>
            <Badge
              variant="outline"
              className="gap-1.5 border-green-200 bg-green-100 py-1 pr-2.5 pl-1.5 text-sm font-normal text-green-800 capitalize dark:border-green-800 dark:bg-green-900/30 dark:text-green-400"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Selesai / Terlapor
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
            <span className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-xs">
              ID: {report.id.slice(0, 8)}...
            </span>
            <span>•</span>
            {/* Header menampilkan Tanggal Kegiatan (Activity Date) */}
            <span>
              {report.activityDate
                ? format(new Date(report.activityDate), 'dd MMMM yyyy', {
                    locale: idLocale,
                  })
                : '-'}
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* --- LEFT COLUMN (MAIN INFO) --- */}
        <div className="space-y-6 lg:col-span-2">
          {/* Card: Informasi Dasar */}
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
                  <User className="h-4 w-4" /> Pelapor (Reporter)
                </div>
                <div className="font-medium">{report.reporterName}</div>
                <div className="text-muted-foreground text-xs capitalize">
                  {report.reporterRole?.replace('_', ' ')}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-muted-foreground mb-1 flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4" /> Lokasi Ruangan
                </div>
                <div className="font-medium">{report.roomName || 'Ruangan Tidak Diketahui'}</div>
              </div>

              {/* TANGGAL KEGIATAN (REAL) */}
              <div className="space-y-1">
                <div className="text-muted-foreground mb-1 flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" /> Waktu Kegiatan
                </div>
                <div className="font-medium">
                  {report.activityDate
                    ? format(new Date(report.activityDate), 'EEEE, dd MMMM yyyy', {
                        locale: idLocale,
                      })
                    : '-'}
                </div>
              </div>

              {/* WAKTU INPUT (SYSTEM) - Tambahan agar informatif */}
              <div className="space-y-1">
                <div className="text-muted-foreground mb-1 flex items-center gap-2 text-sm">
                  <History className="h-4 w-4" /> Waktu Input Sistem
                </div>
                <div className="font-medium">
                  {report.createdAt
                    ? format(new Date(report.createdAt), "dd MMM yyyy - HH:mm 'WIB'", {
                        locale: idLocale,
                      })
                    : '-'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card: Daftar Barang */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5 text-blue-600" />
                Daftar Barang ({details.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Nama Barang</TableHead>
                    <TableHead className="text-center">Jumlah Digunakan</TableHead>
                    <TableHead>Batch Number</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {details.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground text-center">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{item.consumableName}</span>
                          <span className="text-muted-foreground text-[10px]">{item.unit}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-mono font-medium">
                        {Number(item.quantity)} {item.unit}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.batchNumber ? (
                          <span className="bg-muted rounded px-2 py-1">{item.batchNumber}</span>
                        ) : (
                          <span className="text-muted-foreground italic">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* --- RIGHT COLUMN (TIMELINE) --- */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="flex h-full flex-col">
            <CardHeader className="shrink-0">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-blue-600" />
                Timeline Aktivitas
              </CardTitle>
            </CardHeader>

            <CardContent className="overflow-x-hidden overflow-y-auto pr-2">
              <div className="border-muted relative ml-3 space-y-8 border-l pb-1 pl-6">
                {/* Single Event: Laporan Dibuat */}
                <div className="relative">
                  <div className="ring-background absolute top-1 -left-7.25 h-2.5 w-2.5 rounded-full border border-blue-600 bg-blue-600 ring-4" />

                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs">
                      {timelineEvent.createdAt
                        ? format(new Date(timelineEvent.createdAt), "dd MMM yyyy, HH:mm 'WIB'", {
                            locale: idLocale,
                          })
                        : '-'}
                    </span>

                    <div className="text-foreground text-sm font-bold">Laporan Dibuat</div>

                    <p className="text-muted-foreground bg-muted/50 mt-1 rounded p-2 text-sm italic">
                      &quot;{timelineEvent.notes}&quot;
                    </p>

                    <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
                      <User className="h-3 w-3" />
                      <span>{timelineEvent.actorName || 'System'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
