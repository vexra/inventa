import { desc, eq } from 'drizzle-orm'

import { units, user, warehouses } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

import { UserDialog } from './_components/user-dialog'
import { UserList } from './_components/user-list'

export default async function UsersPage() {
  await requireAuth({ roles: ['administrator'] })

  // Ambil data user beserta relasi unit dan warehouse
  // Kita pakai Drizzle langsung agar bisa join tabel dengan mudah
  const usersData = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      banned: user.banned,
      unitId: user.unitId,
      warehouseId: user.warehouseId,
      unit: { name: units.name },
      warehouse: { name: warehouses.name },
    })
    .from(user)
    .leftJoin(units, eq(user.unitId, units.id))
    .leftJoin(warehouses, eq(user.warehouseId, warehouses.id))
    .orderBy(desc(user.createdAt))

  const unitsData = await db.select().from(units)
  const warehousesData = await db.select().from(warehouses)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pengguna</h1>
          <p className="text-muted-foreground">Kelola akses, role, dan status pengguna sistem.</p>
        </div>
        <UserDialog mode="create" units={unitsData} warehouses={warehousesData} />
      </div>

      <UserList data={usersData} units={unitsData} warehouses={warehousesData} />
    </div>
  )
}
