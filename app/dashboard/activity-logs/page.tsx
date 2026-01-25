import { SQL, and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { PgColumn } from 'drizzle-orm/pg-core'

import { auditLogs, user } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

import { LogsTable } from './_components/activity-logs-table'

export interface ActivityLogEntry {
  id: string
  action: string
  tableName: string
  recordId: string
  oldValues: unknown
  newValues: unknown
  createdAt: Date
  actorName: string | null
  actorEmail: string | null
}

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
    limit?: string
    sort?: string
    order?: 'asc' | 'desc'
  }>
}

export default async function LogsPage({ searchParams }: PageProps) {
  const session = await requireAuth({
    roles: ['super_admin', 'warehouse_staff', 'faculty_admin', 'unit_admin', 'unit_staff'],
  })

  const params = await searchParams
  const query = params.q || ''
  const currentPage = Number(params.page) || 1
  const itemsPerPage = Number(params.limit) || 10
  const sortCol = params.sort || 'createdAt'
  const sortOrder = params.order || 'asc'
  const offset = (currentPage - 1) * itemsPerPage

  const isSuperAdmin = session.user.role === 'super_admin'
  const userCondition = isSuperAdmin ? undefined : eq(auditLogs.userId, session.user.id)

  const searchCondition = query
    ? or(
        ilike(user.name, `%${query}%`),
        ilike(auditLogs.tableName, `%${query}%`),
        ilike(auditLogs.action, `%${query}%`),
      )
    : undefined

  const finalCondition = and(searchCondition, userCondition)

  const sortMap: Record<string, PgColumn | SQL> = {
    createdAt: auditLogs.createdAt,
    action: auditLogs.action,
    tableName: auditLogs.tableName,
    actorName: user.name,
  }

  const orderColumn = sortMap[sortCol] || auditLogs.createdAt
  const orderBy = sortOrder === 'desc' ? desc(orderColumn) : asc(orderColumn)

  const dataPromise = db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      tableName: auditLogs.tableName,
      recordId: auditLogs.recordId,
      oldValues: auditLogs.oldValues,
      newValues: auditLogs.newValues,
      createdAt: auditLogs.createdAt,
      actorName: user.name,
      actorEmail: user.email,
    })
    .from(auditLogs)
    .leftJoin(user, eq(auditLogs.userId, user.id))
    .where(finalCondition)
    .limit(itemsPerPage)
    .offset(offset)
    .orderBy(orderBy)

  const countPromise = db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .leftJoin(user, eq(auditLogs.userId, user.id))
    .where(finalCondition)

  const [data, countResult] = await Promise.all([
    dataPromise as Promise<ActivityLogEntry[]>,
    countPromise,
  ])

  const totalItems = Number(countResult[0]?.count || 0)
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Activity Logs</h1>
        <p className="text-muted-foreground">
          {isSuperAdmin
            ? 'Memantau seluruh riwayat perubahan data sistem oleh semua pengguna.'
            : 'Memantau riwayat aktivitas dan perubahan data pada akun Anda.'}
        </p>
      </div>

      <LogsTable
        data={data}
        currentSort={{ column: sortCol, direction: sortOrder as 'asc' | 'desc' }}
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
