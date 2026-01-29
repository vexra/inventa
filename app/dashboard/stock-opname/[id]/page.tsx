import Link from 'next/link'
import { notFound } from 'next/navigation'

import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { ArrowLeft, Calendar, History, Layers, MapPin, Package, Package2, Tags } from 'lucide-react'

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
import { requireAuth } from '@/lib/auth-guard'

import { OpnameAction } from '../_components/opname-action'
import { getStockDetail } from '../actions'
import { AdjustmentHistoryTable } from './_components/adjustment-history-table'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    page?: string
    limit?: string
    q?: string
  }>
}

export default async function StockOpnameDetailPage({ params, searchParams }: PageProps) {
  await requireAuth({ roles: ['warehouse_staff'] })

  const { id } = await params
  const { page, limit, q } = await searchParams

  const currentPage = Number(page) || 1
  const itemsPerPage = Number(limit) || 10
  const query = q || ''

  const data = await getStockDetail(id, currentPage, itemsPerPage, query)

  if (!data) {
    notFound()
  }

  const totalStock = data.batches.reduce((acc, curr) => acc + curr.quantity, 0)
  const totalPages = Math.ceil(data.totalHistoryItems / itemsPerPage)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/stock-opname">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{data.name}</h1>
              <Badge
                variant="outline"
                className="border-blue-200 bg-blue-50 text-blue-600 capitalize"
              >
                {data.categoryName || 'Uncategorized'}
              </Badge>
            </div>
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <span className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-xs">
                ID: {data.id.slice(0, 8)}...
              </span>
            </p>
          </div>
        </div>

        <OpnameAction
          consumable={{ id: data.id, name: data.name, unit: data.unit }}
          batches={data.batches}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  Total Stok Fisik
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-1 text-2xl font-bold">
                  {totalStock}{' '}
                  <span className="text-muted-foreground text-sm font-normal">{data.unit}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  Jumlah Batch
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.batches.length}{' '}
                  <span className="text-muted-foreground text-sm font-normal">Batch</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Layers className="h-5 w-5 text-blue-600" />
                Daftar Batch & Kadaluarsa
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Batch Number</TableHead>
                    <TableHead>Tanggal Kadaluarsa</TableHead>
                    <TableHead className="text-right">Stok Saat Ini</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.batches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                        Tidak ada stok tersedia di gudang ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.batches.map((batch, index) => (
                      <TableRow key={batch.id}>
                        <TableCell className="text-muted-foreground text-center">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          {batch.batchNumber ? (
                            <span className="bg-muted rounded px-2 py-1 font-mono text-xs">
                              {batch.batchNumber}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm italic">
                              - No Batch -
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="text-muted-foreground h-3.5 w-3.5" />
                            {batch.expiryDate
                              ? format(new Date(batch.expiryDate), 'dd MMM yyyy', {
                                  locale: idLocale,
                                })
                              : '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {batch.quantity} {data.unit}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="h-5 w-5 text-orange-600" />
                Riwayat Penyesuaian (Opname)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <AdjustmentHistoryTable
                data={data.adjustments}
                unit={data.unit}
                metadata={{
                  totalItems: data.totalHistoryItems,
                  totalPages,
                  currentPage,
                  itemsPerPage,
                  hasNextPage: currentPage < totalPages,
                  hasPrevPage: currentPage > 1,
                }}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-1">
          <Card className="flex h-fit flex-col">
            <CardHeader className="shrink-0">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package2 className="h-5 w-5 text-blue-600" />
                Atribut Barang
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-1">
                <div className="text-muted-foreground mb-1 flex items-center gap-2 text-sm">
                  <Tags className="h-4 w-4" /> Kategori
                </div>
                <div className="font-medium">{data.categoryName || '-'}</div>
              </div>

              <div className="space-y-1">
                <div className="text-muted-foreground mb-1 flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4" /> Satuan Dasar
                </div>
                <div className="font-medium capitalize">{data.unit}</div>
              </div>

              <div className="space-y-1">
                <div className="text-muted-foreground mb-1 flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4" /> Lokasi Gudang
                </div>
                <div className="text-sm font-medium">
                  {data.warehouseName || 'Gudang Tidak Diketahui'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
