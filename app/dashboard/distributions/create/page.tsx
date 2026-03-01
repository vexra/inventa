import { db } from '@/lib/db' // Sesuaikan path database Anda
import { assetModels, rooms, buildings } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { DistributionForm } from '../_components/distribution-form'
import { requireAuth } from '@/lib/auth-guard'

export const metadata = {
  title: 'Buat Distribusi Aset Baru',
}

export default async function CreateDistributionPage() {
  // 1. Ambil Data User yang sedang login
  const session = await requireAuth({ 
    roles: ['super_admin', 'warehouse_staff', 'faculty_admin'] 
  })
  const actorId = session.user.id

  // 2. Ambil Master Katalog Aset
  const modelsData = await db.query.assetModels.findMany({
    columns: { id: true, name: true },
    orderBy: (models, { asc }) => [asc(models.name)],
  })

  // 3. Ambil Daftar Ruangan beserta nama gedungnya untuk memudahkan admin
  const roomsData = await db.query.rooms.findMany({
    with: {
      building: { columns: { name: true } }
    },
    orderBy: (rooms, { asc }) => [asc(rooms.name)],
  })

  // Format data ruangan agar mudah dipakai di Client Component
  const formattedRooms = roomsData.map(room => ({
    id: room.id,
    name: room.name,
    buildingName: room.building?.name || 'Gedung Tidak Diketahui'
  }))

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Buat Dropping Aset</h2>
      </div>
      <p className="text-muted-foreground mb-6">
        Alokasikan aset ke ruangan-ruangan. Sistem akan otomatis membuatkan data fisik dan QR Code saat draft ini dieksekusi.
      </p>

      {/* Render Client Component Form */}
      <DistributionForm 
        models={modelsData} 
        rooms={formattedRooms} 
        actorId={actorId} 
      />
    </div>
  )
}