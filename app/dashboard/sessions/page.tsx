import { asc, count, ilike, or } from 'drizzle-orm'
import { AlertCircle } from 'lucide-react'

import { PaginationControls } from '@/components/shared/pagination-controls'
import { SearchInput } from '@/components/shared/search-input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { user } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'

import { SessionSheet } from './_components/session-sheet'

const ITEMS_PER_PAGE = 10

interface PageProps {
  searchParams: Promise<{
    q?: string
    page?: string
  }>
}

export default async function SessionsPage({ searchParams }: PageProps) {
  await requireAuth({ roles: ['super_admin'] })

  const params = await searchParams
  const query = params.q || ''
  const currentPage = Number(params.page) || 1
  const offset = (currentPage - 1) * ITEMS_PER_PAGE

  const filterCondition = query
    ? or(ilike(user.name, `%${query}%`), ilike(user.email, `%${query}%`))
    : undefined

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
    .limit(ITEMS_PER_PAGE)
    .offset(offset)
    .orderBy(asc(user.name))

  const countPromise = db.select({ value: count() }).from(user).where(filterCondition)

  const [users, totalCountResult] = await Promise.all([usersPromise, countPromise])

  const totalUsers = totalCountResult[0].value
  const totalPages = Math.ceil(totalUsers / ITEMS_PER_PAGE)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Sesi Login Pengguna</h1>
        <p className="text-muted-foreground">
          Pantau dan kelola sesi aktif pengguna untuk menjaga keamanan sistem.
        </p>
      </div>

      <Alert className="mb-4 border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Info Keamanan</AlertTitle>
        <AlertDescription className="text-blue-700 dark:text-blue-400">
          Mencabut sesi akan memaksa pengguna untuk login kembali pada perangkat terkait.
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-between gap-2">
        <SearchInput placeholder="Cari nama pengguna..." className="w-full sm:max-w-xs" />
      </div>

      <div className="bg-card rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pengguna</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  Tidak ada pengguna ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={u.image || ''} />
                      <AvatarFallback>
                        {u.name?.substring(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{u.name}</span>
                      <span className="text-muted-foreground text-xs">{u.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {u.role?.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <SessionSheet userId={u.id} userName={u.name} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end">
        <PaginationControls totalPages={totalPages} />
      </div>
    </div>
  )
}
