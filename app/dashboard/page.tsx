import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  FileText,
  Package,
  Users,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Page() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-4">
      {/* --- HEADER --- */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Ringkasan aktivitas sistem dan status inventaris.</p>
        </div>
        <div className="flex items-center space-x-2">
          <button className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow transition-colors">
            Download Laporan
          </button>
        </div>
      </div>

      {/* --- KEY METRICS (4 CARDS) --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Pengguna */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pengguna</CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">128</div>
            <p className="text-muted-foreground text-xs">+4 pengguna baru bulan ini</p>
          </CardContent>
        </Card>

        {/* Card 2: Request Pending (Perlu perhatian Admin/Approver) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Permintaan Pending</CardTitle>
            <FileText className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-muted-foreground text-xs">Membutuhkan persetujuan</p>
          </CardContent>
        </Card>

        {/* Card 3: Stok Kritis (Perlu perhatian Warehouse) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Menipis</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-muted-foreground text-xs">Item di bawah batas minimum</p>
          </CardContent>
        </Card>

        {/* Card 4: Total Aset/Barang */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jenis Barang</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">342</div>
            <p className="text-muted-foreground text-xs">Tersebar di 3 Gudang</p>
          </CardContent>
        </Card>
      </div>

      {/* --- MAIN CONTENT SPLIT --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* LEFT: Statistik Visual (Placeholder Grafik) */}
        <Card className="col-span-4 h-full">
          <CardHeader>
            <CardTitle>Tren Permintaan Barang</CardTitle>
            <CardDescription>
              Volume permintaan dari unit kerja dalam 7 hari terakhir.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {/* Visualisasi Placeholder Grafik Batang */}
            <div className="flex h-75 w-full items-end justify-between gap-2 px-4 pt-8">
              {/* Batang-batang grafik simulasi */}
              {[40, 25, 60, 35, 80, 50, 90].map((height, i) => (
                <div key={i} className="group relative flex w-1/12 flex-col justify-end gap-2">
                  <div
                    className="bg-primary/80 hover:bg-primary w-full rounded-t-md transition-all"
                    style={{ height: `${height}%` }}
                  ></div>
                  <span className="text-muted-foreground text-center text-[10px]">
                    {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'][i]}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* RIGHT: Recent Activity Logs (Audit Trail Ringkas) */}
        <Card className="col-span-3 h-full">
          <CardHeader>
            <CardTitle>Aktivitas Terkini</CardTitle>
            <CardDescription>Log aktivitas sistem real-time.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {/* Simulasi Data Log */}
              {[
                {
                  user: 'Budi Santoso',
                  action: 'Login ke sistem',
                  time: '2 menit lalu',
                  role: 'Warehouse Admin',
                  icon: Activity,
                },
                {
                  user: 'Siti Aminah',
                  action: 'Membuat Request #REQ-001',
                  time: '15 menit lalu',
                  role: 'Unit Staff',
                  icon: ArrowUpRight,
                },
                {
                  user: 'Andi Saputra',
                  action: 'Stok Opname Gudang A',
                  time: '1 jam lalu',
                  role: 'Warehouse Admin',
                  icon: Package,
                },
                {
                  user: 'System',
                  action: 'Backup Database Otomatis',
                  time: '3 jam lalu',
                  role: 'System',
                  icon: Activity,
                },
                {
                  user: 'Dewi Lestari',
                  action: 'Logout',
                  time: '4 jam lalu',
                  role: 'Executive',
                  icon: ArrowDownRight,
                },
              ].map((item, index) => (
                <div className="flex items-center" key={index}>
                  <div className="bg-muted text-primary mr-4 flex h-9 w-9 items-center justify-center rounded-full">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm leading-none font-medium">{item.user}</p>
                    <p className="text-muted-foreground text-xs">{item.action}</p>
                  </div>
                  <div className="text-muted-foreground ml-auto text-xs">{item.time}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
