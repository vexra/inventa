import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { auth } from '@/lib/auth'
import { type Action, type Resource, type Role, ac } from '@/lib/permissions'

type AuthGuardOptions = {
  // Opsi 1: Hanya butuh login saja (tanpa cek role spesifik)
  // Opsi 2: Butuh salah satu role tertentu
  roles?: Role[]
  // Opsi 3: Butuh permission spesifik (lebih granular)
  permission?: {
    resource: Resource
    action: Action
  }
  // URL untuk redirect jika gagal (default: /sign-in atau /unauthorized)
  redirectTo?: string
}

type StatementChecker = (roles: Role[]) => boolean

export async function requireAuth(options: AuthGuardOptions = {}) {
  // 1. Ambil Session
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  // 2. Cek Login
  if (!session) {
    redirect(options.redirectTo || '/sign-in')
  }

  const userRole = session.user.role as Role

  // 3. Cek Role (Jika opsi roles diberikan)
  if (options.roles) {
    if (!options.roles.includes(userRole)) {
      redirect('/unauthorized')
    }
  }

  // 4. Cek Permission (Menggunakan Access Control Better Auth)
  if (options.permission) {
    const { resource, action } = options.permission

    // Mengambil statement berdasarkan resource
    // Kita gunakan 'as any' agar TS tidak error saat akses dynamic property
    const resourceStatements = ac.statements[resource] as unknown as
      | Record<string, StatementChecker>
      | undefined

    if (!resourceStatements) {
      console.error(`Resource '${resource}' tidak didefinisikan di permissions.ts`)
      redirect('/unauthorized')
    }

    // Ambil fungsi checker untuk action tersebut (contoh: items.create)
    const actionChecker = resourceStatements[action]

    // Cek apakah userRole memiliki izin
    // Syntax: statement.action([role1, role2]) -> return boolean
    if (!actionChecker || !actionChecker([userRole])) {
      redirect('/unauthorized')
    }
  }

  return session
}
