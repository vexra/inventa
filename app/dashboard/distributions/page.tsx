import Link from 'next/link'
import { db } from '@/lib/db' // Sesuaikan path db Anda
import { desc } from 'drizzle-orm'
import { assetDistributions } from '@/db/schema'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Package } from 'lucide-react'
import { ExecuteButton } from './_components/execute-button'
import { requireAuth } from '@/lib/auth-guard'

export const metadata = {
  title: 'Manajemen Distribusi Aset',
}

export default async function DistributionsPage() {
  // Proteksi halaman - hanya user yang login yang bisa akses
  await requireAuth({ 
    roles: ['super_admin', 'warehouse_staff', 'faculty_admin', 'unit_admin'] 
  })

  // Ambil data distribusi, urutkan dari yang terbaru
  const distributions = await db.query.assetDistributions.findMany({
    with: {
      model: { columns: { name: true } },
      actor: { columns: { name: true } },
    },
    orderBy: [desc(assetDistributions.createdAt)],
  })

  // Fungsi pembantu untuk warna Badge Status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT': return <Badge variant="outline" className="text-slate-600 border-slate-300">Draft (Belum Dikirim)</Badge>
      case 'SHIPPED': return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none">Sedang Dikirim</Badge>
      case 'COMPLETED': return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-none">Selesai Diterima</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Distribusi / Dropping</h2>
          <p className="text-muted-foreground">
            Kelola penyebaran massal aset dari Fakultas ke Ruangan/Unit.
          </p>
        </div>
        <Link href="/dashboard/distributions/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Buat Distribusi Baru
          </Button>
        </Link>
      </div>

      {/* TABEL DATA */}
      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Model Aset</TableHead>
              <TableHead className="text-center">Total Unit</TableHead>
              <TableHead>Dibuat Oleh</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {distributions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  Belum ada data distribusi. Klik `Buat Distribusi Baru` untuk memulai.
                </TableCell>
              </TableRow>
            ) : (
              distributions.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.distributionCode}</TableCell>
                  <TableCell>
                    {item.createdAt?.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      {item.model.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-bold">{item.totalQuantity}</TableCell>
                  <TableCell>{item.actor?.name || 'Sistem'}</TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(item.status)}
                  </TableCell>
                  <TableCell className="text-right flex justify-end gap-2">
                    {/* Tombol Eksekusi hanya muncul jika status masih DRAFT */}
                    {item.status === 'DRAFT' && (
                      <ExecuteButton distributionId={item.id} />
                    )}
                    
                    {/* Tombol Detail (Opsional, bisa Anda buat halamannya nanti) */}
                    <Link href={`/dashboard/distributions/${item.id}`}>
                      <Button variant="outline" size="sm">Detail</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}