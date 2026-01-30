import { SQL, asc, count, desc, ilike, or } from 'drizzle-orm'
import { PgColumn } from 'drizzle-orm/pg-core'
import { AlertCircle } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { user } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

import { SessionTable } from './_components/session-table'

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
    limit?: string
    sort?: string
    order?: 'asc' | 'desc'
  }>
}

export default async function SessionsPage({ searchParams }: PageProps) {
  await requireAuth({ roles: ['super_admin'] })

  const params = await searchParams
  const query = params.q || ''
  const currentPage = Number(params.page) || 1
  const itemsPerPage = Number(params.limit) || 10
  const sortCol = params.sort || 'name'
  const sortOrder = params.order || 'asc'
  const offset = (currentPage - 1) * itemsPerPage

  const filterCondition = query
    ? or(ilike(user.name, `%${query}%`), ilike(user.email, `%${query}%`))
    : undefined

  const sortMap: Record<string, PgColumn | SQL> = {
    name: user.name,
    role: user.role,
  }

  const orderColumn = sortMap[sortCol] || user.name
  const orderBy = sortOrder === 'desc' ? desc(orderColumn) : asc(orderColumn)

  const usersPromise = db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.image,
    })
    .from(user)
    .where(filterCondition)
    .limit(itemsPerPage)
    .offset(offset)
    .orderBy(orderBy)

  const countPromise = db.select({ value: count() }).from(user).where(filterCondition)

  const [rawUsers, totalCountResult] = await Promise.all([usersPromise, countPromise])

  const users = rawUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role || 'user',
    image: u.image,
  }))

  const totalItems = totalCountResult[0].value
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Sesi Login Pengguna</h1>
        <p className="text-muted-foreground">
          Pantau dan kelola sesi aktif pengguna untuk menjaga keamanan sistem.
        </p>
      </div>

      <Alert className="border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Info Keamanan</AlertTitle>
        <AlertDescription className="text-blue-700 dark:text-blue-400">
          Mencabut sesi akan memaksa pengguna untuk login kembali pada perangkat terkait.
        </AlertDescription>
      </Alert>

      <SessionTable
        data={users}
        metadata={{
          totalItems,
          totalPages,
          currentPage,
          itemsPerPage,
          hasNextPage: currentPage < totalPages,
          hasPrevPage: currentPage > 1,
        }}
        currentSort={{
          column: sortCol,
          direction: sortOrder as 'asc' | 'desc',
        }}
      />
    </div>
  )
}
