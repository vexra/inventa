import { SQL, asc, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { PgColumn } from 'drizzle-orm/pg-core'

import { faculties, requests, units, user, warehouses } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

import { UserDialog } from './_components/user-dialog'
import { UserList } from './_components/user-list'

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
    limit?: string
    sort?: string
    order?: 'asc' | 'desc'
  }>
}

export default async function UsersPage({ searchParams }: PageProps) {
  await requireAuth({ roles: ['super_admin'] })

  const params = await searchParams
  const query = params.q || ''
  const currentPage = Number(params.page) || 1
  const itemsPerPage = Number(params.limit) || 10
  const sortCol = params.sort || 'name'
  const sortOrder = params.order || 'asc'
  const offset = (currentPage - 1) * itemsPerPage

  const searchCondition = query
    ? or(ilike(user.name, `%${query}%`), ilike(user.email, `%${query}%`))
    : undefined

  const sortMap: Record<string, PgColumn | SQL> = {
    name: user.name,
    role: user.role,
    banned: user.banned,
  }

  const orderBy =
    sortOrder === 'desc' ? desc(sortMap[sortCol] || user.name) : asc(sortMap[sortCol] || user.name)

  const dataPromise = db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      banned: user.banned,
      unitId: user.unitId,
      warehouseId: user.warehouseId,
      facultyId: user.facultyId,
      unitName: units.name,
      unitFacultyId: units.facultyId,
      warehouseName: warehouses.name,
      usageCount: sql<number>`count(${requests.id})`,
    })
    .from(user)
    .leftJoin(units, eq(user.unitId, units.id))
    .leftJoin(warehouses, eq(user.warehouseId, warehouses.id))
    .leftJoin(requests, eq(user.id, requests.requesterId))
    .where(searchCondition)
    .groupBy(user.id, units.id, warehouses.id)
    .limit(itemsPerPage)
    .offset(offset)
    .orderBy(orderBy)

  const countPromise = db
    .select({ count: sql<number>`count(*)` })
    .from(user)
    .where(searchCondition)

  const [rawUsers, countResult, unitsData, warehousesData, facultiesData] = await Promise.all([
    dataPromise,
    countPromise,
    db.select().from(units).orderBy(asc(units.name)),
    db.select().from(warehouses).orderBy(asc(warehouses.name)),
    db.select().from(faculties).orderBy(asc(faculties.name)),
  ])

  const data = rawUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role || 'unit_staff',
    banned: !!u.banned,
    usageCount: Number(u.usageCount),
    unitId: u.unitId,
    warehouseId: u.warehouseId,
    facultyId: u.facultyId,
    unitFacultyId: u.unitFacultyId,
    unit: u.unitName ? { name: u.unitName } : null,
    warehouse: u.warehouseName ? { name: u.warehouseName } : null,
  }))

  const totalItems = Number(countResult[0]?.count || 0)
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pengguna</h1>
          <p className="text-muted-foreground">Kelola akses, role, dan status pengguna sistem.</p>
        </div>
        <UserDialog
          mode="create"
          units={unitsData}
          warehouses={warehousesData}
          faculties={facultiesData}
        />
      </div>

      <UserList
        data={data}
        units={unitsData}
        warehouses={warehousesData}
        faculties={facultiesData}
        currentSort={{ column: sortCol, direction: sortOrder }}
        metadata={{
          totalItems,
          totalPages,
          currentPage,
          itemsPerPage,
          hasNextPage: currentPage < totalPages,
          hasPrevPage: currentPage > 1,
        }}
      />
    </div>
  )
}
