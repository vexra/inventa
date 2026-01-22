import Link from 'next/link'
import { notFound } from 'next/navigation'

import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { desc, eq } from 'drizzle-orm'
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Clock,
  FileText,
  type LucideIcon,
  MapPin,
  Package,
  Truck,
  User,
  Warehouse,
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
  requestItems,
  requestStatusEnum,
  requestTimelines,
  requests,
  rooms,
  user,
  warehouses,
} from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

type RequestStatus = (typeof requestStatusEnum.enumValues)[number]

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function RequestDetailPage({ params }: PageProps) {
  await requireAuth({
    roles: ['unit_staff', 'unit_admin', 'warehouse_staff', 'faculty_admin'],
  })

  const { id } = await params

  const [requestData] = await db
    .select({
      id: requests.id,
      code: requests.requestCode,
      status: requests.status,
      description: requests.description,
      createdAt: requests.createdAt,
      rejectionReason: requests.rejectionReason,

      requesterName: user.name,
      requesterEmail: user.email,
      requesterRole: user.role,

      roomName: rooms.name,
      roomType: rooms.type,

      warehouseName: warehouses.name,
    })
    .from(requests)
    .innerJoin(user, eq(requests.requesterId, user.id))
    .innerJoin(rooms, eq(requests.roomId, rooms.id))
    .leftJoin(warehouses, eq(requests.targetWarehouseId, warehouses.id))
    .where(eq(requests.id, id))
    .limit(1)

  if (!requestData) {
    notFound()
  }

  const items = await db
    .select({
      id: requestItems.id,
      qtyRequested: requestItems.qtyRequested,
      qtyApproved: requestItems.qtyApproved,
      consumableName: consumables.name,
      unit: consumables.baseUnit,
      sku: consumables.sku,
    })
    .from(requestItems)
    .innerJoin(consumables, eq(requestItems.consumableId, consumables.id))
    .where(eq(requestItems.requestId, id))

  const timelines = await db
    .select({
      id: requestTimelines.id,
      status: requestTimelines.status,
      notes: requestTimelines.notes,
      createdAt: requestTimelines.createdAt,
      actorName: user.name,
    })
    .from(requestTimelines)
    .leftJoin(user, eq(requestTimelines.actorId, user.id))
    .where(eq(requestTimelines.requestId, id))
    .orderBy(desc(requestTimelines.createdAt))

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header Section */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/consumable-requests">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {/* Tampilkan Deskripsi sebagai Judul Utama */}
              {requestData.description || 'Detail Permintaan Barang'}
            </h1>
            <StatusBadge status={requestData.status as RequestStatus} />
          </div>
          <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
            <span className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono">
              {requestData.code}
            </span>
            <span>•</span>
            <span>
              {requestData.createdAt
                ? format(new Date(requestData.createdAt), 'dd MMMM yyyy, HH:mm', {
                    locale: idLocale,
                  })
                : '-'}
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content (Left) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Rejection Alert */}
          {requestData.status === 'REJECTED' && requestData.rejectionReason && (
            <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
              <div>
                <h4 className="text-sm font-semibold">Permintaan Ditolak</h4>
                <p className="mt-1 text-sm">
                  Alasan: <span className="font-medium">{requestData.rejectionReason}</span>
                </p>
              </div>
            </div>
          )}

          {/* Info Card */}
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
                <div className="font-medium">{requestData.requesterName}</div>
                <div className="text-muted-foreground text-xs capitalize">
                  {requestData.requesterRole?.replace('_', ' ')}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-muted-foreground mb-1 flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4" /> Lokasi Ruangan
                </div>
                <div className="font-medium">{requestData.roomName}</div>
                <div className="text-muted-foreground text-xs capitalize">
                  Tipe: {requestData.roomType?.replace('_', ' ')}
                </div>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <div className="text-muted-foreground mb-1 flex items-center gap-2 text-sm">
                  <Warehouse className="h-4 w-4" /> Gudang Sumber
                </div>
                <div className="font-medium">{requestData.warehouseName || '-'}</div>
              </div>

              {/* TAMPILKAN DESKRIPSI DI SINI */}
              <div className="space-y-1 rounded-md border bg-slate-50 p-4 sm:col-span-2 dark:bg-slate-900/50">
                <div className="text-muted-foreground mb-1 text-sm font-medium">
                  Keperluan / Deskripsi:
                </div>
                <p className="text-sm">
                  {requestData.description || (
                    <span className="text-muted-foreground italic">Tidak ada deskripsi.</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Items Table Card */}
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
                    <TableHead className="text-center">Jumlah Diminta</TableHead>
                    {requestData.status !== 'PENDING_UNIT' &&
                      requestData.status !== 'PENDING_FACULTY' && (
                        <TableHead className="text-center">Jumlah Disetujui</TableHead>
                      )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground text-center">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{item.consumableName}</span>
                          <span className="text-muted-foreground text-[10px]">
                            Unit: {item.unit} {item.sku && `• SKU: ${item.sku}`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-mono font-medium">
                        {Number(item.qtyRequested)}
                      </TableCell>
                      {requestData.status !== 'PENDING_UNIT' &&
                        requestData.status !== 'PENDING_FACULTY' && (
                          <TableCell className="text-center font-mono font-medium">
                            {item.qtyApproved !== null ? (
                              Number(item.qtyApproved)
                            ) : (
                              <span className="text-muted-foreground text-xs italic">
                                Belum diproses
                              </span>
                            )}
                          </TableCell>
                        )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Timeline Sidebar (Right) */}
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
                            {STATUS_LABEL_MAP[log.status as RequestStatus] || log.status}
                          </span>
                        </div>

                        {log.notes && (
                          <p className="text-muted-foreground bg-muted/50 mt-1 rounded p-2 text-sm italic">
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

const STATUS_LABEL_MAP: Record<RequestStatus, string> = {
  PENDING_UNIT: 'Menunggu Admin Unit',
  PENDING_FACULTY: 'Menunggu Fakultas',
  APPROVED: 'Disetujui',
  PROCESSING: 'Diproses Gudang',
  READY_TO_PICKUP: 'Siap Diambil',
  COMPLETED: 'Selesai',
  REJECTED: 'Ditolak',
  CANCELED: 'Dibatalkan',
}

function StatusBadge({ status }: { status: RequestStatus | string | null }) {
  const normalizedStatus = (status || 'PENDING_UNIT') as RequestStatus

  const styles: Record<RequestStatus, string> = {
    PENDING_UNIT:
      'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
    PENDING_FACULTY:
      'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
    APPROVED:
      'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    PROCESSING:
      'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800',
    READY_TO_PICKUP:
      'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
    COMPLETED:
      'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
    REJECTED:
      'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    CANCELED:
      'bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800/30 dark:text-zinc-400 dark:border-zinc-700',
  }

  const icons: Record<RequestStatus, LucideIcon> = {
    PENDING_UNIT: Clock,
    PENDING_FACULTY: Clock,
    APPROVED: CheckCircle2,
    PROCESSING: Package,
    READY_TO_PICKUP: Truck,
    COMPLETED: CheckCircle2,
    REJECTED: XCircle,
    CANCELED: Ban,
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
