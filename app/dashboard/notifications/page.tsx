import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm'

import { notifications } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

import { NotificationTable } from './_components/notification-table'

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
    limit?: string
    sort?: string
    order?: 'asc' | 'desc'
  }>
}

export default async function NotificationsPage({ searchParams }: PageProps) {
  const session = await requireAuth()

  const params = await searchParams
  const query = params.q || ''
  const currentPage = Number(params.page) || 1
  const itemsPerPage = Number(params.limit) || 10

  const sortCol = params.sort || 'createdAt'
  const sortOrder = params.order || 'desc'

  const offset = (currentPage - 1) * itemsPerPage

  const searchCondition = and(
    eq(notifications.userId, session.user.id),
    query
      ? or(ilike(notifications.title, `%${query}%`), ilike(notifications.message, `%${query}%`))
      : undefined,
  )

  const orderColumn = sortCol === 'title' ? notifications.title : notifications.createdAt
  const orderBy = sortOrder === 'desc' ? desc(orderColumn) : asc(orderColumn)

  const dataPromise = db
    .select()
    .from(notifications)
    .where(searchCondition)
    .limit(itemsPerPage)
    .offset(offset)
    .orderBy(orderBy)

  const countPromise = db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(searchCondition)

  const [data, countResult] = await Promise.all([dataPromise, countPromise])

  const totalItems = Number(countResult[0]?.count || 0)
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifikasi</h1>
          <p className="text-muted-foreground">Pusat informasi dan aktivitas akun Anda</p>
        </div>
      </div>

      <NotificationTable
        data={data}
        metadata={{
          totalItems,
          totalPages,
          currentPage,
          itemsPerPage,
          hasNextPage: currentPage < totalPages,
          hasPrevPage: currentPage > 1,
        }}
        currentSort={{ column: sortCol, direction: sortOrder }}
      />
    </div>
  )
}
