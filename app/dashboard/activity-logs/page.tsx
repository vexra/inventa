import { and, desc, eq, ilike, or, sql } from 'drizzle-orm'

import { PaginationControls } from '@/components/shared/pagination-controls'
import { SearchInput } from '@/components/shared/search-input'
import { auditLogs, user } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

import { LogsTable } from './_components/activity-logs-table'

const ITEMS_PER_PAGE = 10

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
  }>
}

export default async function LogsPage({ searchParams }: PageProps) {
  const session = await requireAuth({
    roles: ['super_admin', 'warehouse_staff', 'faculty_admin', 'unit_admin', 'unit_staff'],
  })

  const params = await searchParams
  const query = params.q || ''
  const currentPage = Number(params.page) || 1
  const offset = (currentPage - 1) * ITEMS_PER_PAGE

  const isSuperAdmin = session.user.role === 'super_admin'

  const searchCondition = query
    ? or(ilike(user.name, `%${query}%`), ilike(auditLogs.tableName, `%${query}%`))
    : undefined

  const userCondition = isSuperAdmin ? undefined : eq(auditLogs.userId, session.user.id)

  const finalCondition = and(searchCondition, userCondition)

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
      actorImage: user.image,
    })
    .from(auditLogs)
    .leftJoin(user, eq(auditLogs.userId, user.id))
    .where(finalCondition)
    .limit(ITEMS_PER_PAGE)
    .offset(offset)
    .orderBy(desc(auditLogs.createdAt))

  const countPromise = db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .leftJoin(user, eq(auditLogs.userId, user.id))
    .where(finalCondition)

  const [data, countResult] = await Promise.all([dataPromise, countPromise])

  const totalItems = Number(countResult[0]?.count || 0)
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Activity Logs</h1>
        <p className="text-muted-foreground">
          {isSuperAdmin
            ? 'Memantau seluruh riwayat perubahan data sistem.'
            : 'Memantau riwayat aktivitas akun Anda.'}
        </p>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <SearchInput
          placeholder={
            isSuperAdmin ? 'Cari berdasarkan User atau Tabel...' : 'Cari riwayat aktivitas...'
          }
          className="w-full sm:max-w-xs"
        />
      </div>

      <div className="flex flex-col gap-4">
        <LogsTable data={data} />

        {totalPages > 1 && <PaginationControls totalPages={totalPages} />}

        {data.length === 0 && (
          <div className="text-muted-foreground py-10 text-center">
            {query
              ? `Tidak ditemukan log dengan kata kunci "${query}".`
              : 'Belum ada riwayat aktivitas.'}
          </div>
        )}
      </div>
    </div>
  )
}
