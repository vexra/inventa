import { asc, eq, ilike, or, sql } from 'drizzle-orm'

import { PaginationControls } from '@/components/shared/pagination-controls'
import { SearchInput } from '@/components/shared/search-input'
import { requests, units, user, warehouses } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

import { UserDialog } from './_components/user-dialog'
import { UserList } from './_components/user-list'

const USERS_PER_PAGE = 10

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
  }>
}

export default async function UsersPage({ searchParams }: PageProps) {
  await requireAuth({ roles: ['super_admin'] })

  const params = await searchParams
  const query = params.q || ''
  const currentPage = Number(params.page) || 1
  const offset = (currentPage - 1) * USERS_PER_PAGE

  const searchCondition = query
    ? or(ilike(user.name, `%${query}%`), ilike(user.email, `%${query}%`))
    : undefined

  const dataPromise = db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      banned: user.banned,
      unitId: user.unitId,
      warehouseId: user.warehouseId,
      unitName: units.name,
      warehouseName: warehouses.name,
      usageCount: sql<number>`(
        SELECT count(*) FROM ${requests} WHERE ${requests.requesterId} = ${user.id}
      )`.mapWith(Number),
    })
    .from(user)
    .leftJoin(units, eq(user.unitId, units.id))
    .leftJoin(warehouses, eq(user.warehouseId, warehouses.id))
    .where(searchCondition)
    .limit(USERS_PER_PAGE)
    .offset(offset)
    .orderBy(asc(user.name))

  const countPromise = db
    .select({ count: sql<number>`count(*)` })
    .from(user)
    .where(searchCondition)

  const unitsPromise = db.select().from(units)
  const warehousesPromise = db.select().from(warehouses)

  const [rawUsers, countResult, unitsData, warehousesData] = await Promise.all([
    dataPromise,
    countPromise,
    unitsPromise,
    warehousesPromise,
  ])

  const data = rawUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role || 'unit_staff',
    banned: u.banned || false,
    unitId: u.unitId,
    warehouseId: u.warehouseId,
    usageCount: u.usageCount,
    unit: u.unitName ? { name: u.unitName } : null,
    warehouse: u.warehouseName ? { name: u.warehouseName } : null,
  }))

  const totalItems = Number(countResult[0]?.count || 0)
  const totalPages = Math.ceil(totalItems / USERS_PER_PAGE)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pengguna</h1>
          <p className="text-muted-foreground">Kelola akses, role, dan status pengguna.</p>
        </div>
        <UserDialog mode="create" units={unitsData} warehouses={warehousesData} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <SearchInput placeholder="Cari nama pengguna..." className="w-full sm:max-w-xs" />
      </div>

      <div className="flex flex-col gap-4">
        <UserList data={data} units={unitsData} warehouses={warehousesData} />

        {totalPages > 1 && <PaginationControls totalPages={totalPages} />}
      </div>
    </div>
  )
}
