import { createAccessControl } from 'better-auth/plugins/access'
import { adminAc, defaultStatements } from 'better-auth/plugins/admin/access'

/**
 * 1. DEFINISI STATEMENT
 * Daftar semua Resource dan Action yang ada di aplikasi
 */
const statement = {
  // Warisi permission bawaan admin (ban, impersonate, dll)
  ...defaultStatements,

  // Resource Custom Aplikasi
  items: ['create', 'read', 'update', 'delete'],
  categories: ['create', 'read', 'update', 'delete'],
  warehouse_stock: ['read', 'update', 'manage'],
  unit_stock: ['read', 'manage'],
  requests: ['create', 'read', 'approve', 'reject'],
  procurements: ['create', 'read', 'approve', 'reject'],
  reports: ['read'],
  users: ['create', 'read', 'update', 'delete', 'ban', 'impersonate'], // Eksplisit untuk user management
} as const

// 2. BUAT INSTANCE ACCESS CONTROL
const ac = createAccessControl(statement)

/**
 * 3. DEFINISI ROLE
 */

// ADMINISTRATOR: Gabungan akses admin plugin + akses penuh aplikasi
export const administrator = ac.newRole({
  ...adminAc.statements,
  items: ['create', 'read', 'update', 'delete'],
  categories: ['create', 'read', 'update', 'delete'],
  warehouse_stock: ['read', 'update', 'manage'],
  unit_stock: ['read', 'manage'],
  requests: ['create', 'read', 'approve', 'reject'],
  procurements: ['create', 'read', 'approve', 'reject'],
  reports: ['read'],
  users: ['create', 'read', 'update', 'delete', 'ban', 'impersonate'],
})

// WAREHOUSE STAFF
export const warehouse_staff = ac.newRole({
  items: ['create', 'read', 'update'],
  categories: ['read'],
  warehouse_stock: ['read', 'update', 'manage'],
  unit_stock: ['read'],
  requests: ['read', 'approve', 'reject'],
  procurements: ['create', 'read'],
})

// UNIT STAFF
export const unit_staff = ac.newRole({
  items: ['read'],
  categories: ['read'],
  unit_stock: ['read', 'manage'],
  requests: ['create', 'read'],
})

// EXECUTIVE
export const executive = ac.newRole({
  items: ['read'],
  categories: ['read'],
  warehouse_stock: ['read'],
  unit_stock: ['read'],
  requests: ['read'],
  procurements: ['read', 'approve', 'reject'],
  reports: ['read'],
})

// Export instance AC untuk dipakai di config auth.ts
export { ac }

/**
 * 4. EXPORT TYPE DEFINITIONS (PENTING UNTUK AUTH GUARD)
 * Ini menggantikan type manual yang sebelumnya error
 */

// Mengambil nama resource secara otomatis dari statement
export type Resource = keyof typeof statement

// Mendefinisikan Action secara manual atau union
export type Action =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'manage'
  | 'ban'
  | 'impersonate'
  | 'share'

// Role harus sesuai dengan Enum di Database
export type Role = 'administrator' | 'warehouse_staff' | 'unit_staff' | 'executive'
