import { type userRoleEnum } from '@/db/schema'

// 1. Definisikan Role sesuai Schema
export type Role = (typeof userRoleEnum.enumValues)[number]

// 2. Definisikan Resource (Fitur Aplikasi)
export type Resource =
  | 'users'
  | 'items'
  | 'warehouse_stock'
  | 'unit_stock'
  | 'requests'
  | 'procurements'
  | 'reports'

// 3. Definisikan Action (Apa yang bisa dilakukan)
export type Action = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'reject' | 'manage'

// 4. Struktur Permission
type PermissionMatrix = {
  [key in Role]: {
    [key in Resource]?: Action[] | '*' // '*' artinya akses penuh
  }
}

// 5. Konfigurasi Hak Akses
export const ROLE_PERMISSIONS: PermissionMatrix = {
  administrator: {
    users: '*', // Admin plugin access
    items: '*',
    warehouse_stock: '*',
    unit_stock: '*',
    requests: '*',
    procurements: '*',
    reports: '*',
  },
  warehouse_staff: {
    items: ['read', 'create', 'update'],
    warehouse_stock: ['read', 'update', 'manage'], // Stock Opname
    requests: ['read', 'approve', 'reject'], // Memproses permintaan unit
    procurements: ['read', 'create'], // Mengajukan pengadaan
    unit_stock: ['read'],
  },
  unit_staff: {
    items: ['read'],
    unit_stock: ['read', 'manage'], // Mengelola stok unit sendiri
    requests: ['read', 'create'], // Membuat permintaan barang
  },
  executive: {
    items: ['read'],
    warehouse_stock: ['read'],
    unit_stock: ['read'],
    requests: ['read'],
    procurements: ['read', 'approve', 'reject'], // Approval pengadaan
    reports: ['read'], // Melihat laporan
  },
}

/**
 * Helper function untuk mengecek izin
 * @param role Role user saat ini
 * @param resource Fitur yang diakses
 * @param action Aksi yang ingin dilakukan
 */
export function hasPermission(role: Role, resource: Resource, action: Action): boolean {
  const permissions = ROLE_PERMISSIONS[role]

  // Jika role tidak terdefinisi
  if (!permissions) return false

  // Cek permission spesifik resource
  const resourcePermissions = permissions[resource]

  if (!resourcePermissions) return false

  // Jika punya akses wildcard '*'
  if (resourcePermissions === '*') return true

  // Cek apakah action ada di dalam array
  return resourcePermissions.includes(action)
}
