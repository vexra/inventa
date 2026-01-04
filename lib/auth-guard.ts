import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { auth } from '@/lib/auth'
import { type Action, type Resource, type Role, hasPermission } from '@/lib/permissions'

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

/**
 * Fungsi ini memvalidasi session dan hak akses.
 * Jika valid, mengembalikan object session.
 * Jika tidak valid, otomatis redirect.
 */
export async function requireAuth(options: AuthGuardOptions = {}) {
  // 1. Ambil Session
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  // 2. Cek apakah user login
  if (!session) {
    redirect(options.redirectTo || '/sign-in')
  }

  const userRole = session.user.role as Role

  // 3. Cek Role (Jika opsi roles diberikan)
  if (options.roles) {
    if (!options.roles.includes(userRole)) {
      // User login, tapi role tidak cocok -> Lempar ke halaman unauthorized
      redirect('/unauthorized')
    }
  }

  // 4. Cek Permission (Jika opsi permission diberikan)
  if (options.permission) {
    const { resource, action } = options.permission
    if (!hasPermission(userRole, resource, action)) {
      // User login, role oke, tapi tidak punya izin spesifik -> Lempar ke unauthorized
      redirect('/unauthorized')
    }
  }

  // 5. Jika lolos semua, kembalikan session agar bisa dipakai di page
  return session
}
