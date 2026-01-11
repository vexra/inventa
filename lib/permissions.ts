import { createAccessControl } from 'better-auth/plugins/access'
import { adminAc, defaultStatements } from 'better-auth/plugins/admin/access'

/**
 * 1. DEFINISI STATEMENT
 * Daftar Resources disesuaikan dengan ERD baru:
 * - organization: Fakultas, Unit, Ruangan, Gudang
 * - catalog: Consumables (BHP), Asset Models (Definisi Aset)
 * - inventory: Stok Gudang, Stok Ruangan, Fisik Aset Tetap
 * - requests: Peminjaman/Permintaan Barang
 * - procurements: Pengadaan Barang
 * - audits: Stock Opname & Audit Aset
 */
const statement = {
  // Warisi permission bawaan admin plugin (ban user, impersonate)
  ...defaultStatements,

  // A. DATA MASTER (Struktur Org & Katalog Barang)
  organization: ['create', 'read', 'update', 'delete'],
  catalog: ['create', 'read', 'update', 'delete'],

  // B. INVENTORY (Stok & Aset Fisik)
  inventory_warehouse: ['read', 'update', 'adjust'], // Stok di Gudang
  inventory_room: ['read', 'update', 'adjust'], // Stok di Ruangan
  fixed_assets: ['read', 'create', 'update', 'audit'], // Aset Tetap

  // C. TRANSAKSI & APPROVAL
  requests: [
    'create',
    'read',
    'update',
    'delete',
    'approve_unit', // Approval Tahap 1 (Kajur)
    'approve_faculty', // Approval Tahap 2 (Dekanat)
    'fulfill', // Gudang memproses/menyiapkan barang
    'complete', // User menerima barang
  ],

  procurements: ['create', 'read', 'update', 'approve', 'receive'], // Receive = Barang datang masuk stok

  // D. PELAPORAN
  usage_reports: ['create', 'read'], // Lapor pakai BHP
  audit_logs: ['read'], // History sistem
} as const

// 2. BUAT INSTANCE ACCESS CONTROL
const ac = createAccessControl(statement)

/**
 * 3. DEFINISI ROLE
 * Sesuai dengan Enum di schema database
 */

// SUPER ADMIN (IT / Admin Pusat)
// Akses penuh ke seluruh sistem, termasuk konfigurasi user
export const super_admin = ac.newRole({
  ...adminAc.statements, // ban, impersonate
  organization: ['create', 'read', 'update', 'delete'],
  catalog: ['create', 'read', 'update', 'delete'],
  inventory_warehouse: ['read', 'update', 'adjust'],
  inventory_room: ['read', 'update', 'adjust'],
  fixed_assets: ['read', 'create', 'update', 'audit'],
  requests: [
    'create',
    'read',
    'update',
    'delete',
    'approve_unit',
    'approve_faculty',
    'fulfill',
    'complete',
  ],
  procurements: ['create', 'read', 'update', 'approve', 'receive'],
  usage_reports: ['create', 'read'],
  audit_logs: ['read'],
})

// WAREHOUSE STAFF (Petugas Gudang)
// Fokus: Mengelola stok fisik, terima barang baru, siapkan barang request
export const warehouse_staff = ac.newRole({
  organization: ['read'], // Cek ruangan/unit tujuan
  catalog: ['read', 'create', 'update'], // Bisa tambah barang baru jika belum ada
  inventory_warehouse: ['read', 'update', 'adjust'], // Stock Opname Gudang
  inventory_room: ['read'], // Hanya lihat stok ruangan
  fixed_assets: ['read', 'create', 'update', 'audit'], // Register aset baru / Audit aset
  requests: ['read', 'fulfill'], // Melihat request & Packing barang
  procurements: ['read', 'receive'], // Cek status PO & Terima barang vendor
  usage_reports: ['read'],
})

// FACULTY ADMIN (Dekanat / WD2)
// Fokus: Approval anggaran/barang mahal & Monitoring laporan
export const faculty_admin = ac.newRole({
  organization: ['read'],
  catalog: ['read'],
  inventory_warehouse: ['read'],
  inventory_room: ['read'],
  fixed_assets: ['read'],
  requests: ['read', 'approve_faculty'], // Approval Tahap 2
  procurements: ['read', 'approve'], // Approve Pengadaan
  usage_reports: ['read'],
  audit_logs: ['read'],
})

// UNIT ADMIN (Kajur / Kaprodi)
// Fokus: Approval request staff mereka & Monitoring aset jurusan
export const unit_admin = ac.newRole({
  organization: ['read'],
  catalog: ['read'],
  inventory_warehouse: ['read'], // Cek ketersediaan di gudang
  inventory_room: ['read'], // Cek stok di lab bawahannya
  fixed_assets: ['read'],
  requests: ['read', 'create', 'approve_unit'], // Approval Tahap 1 & Bisa request juga
  usage_reports: ['read', 'create'],
})

// UNIT STAFF (Dosen / Laboran / TU)
// Fokus: Request barang & Lapor pemakaian
export const unit_staff = ac.newRole({
  organization: ['read'],
  catalog: ['read'],
  inventory_warehouse: ['read'], // Cek stok gudang (tersedia/tidak)
  inventory_room: ['read'], // Cek stok di ruangannya sendiri
  fixed_assets: ['read'],
  requests: ['create', 'read', 'update', 'delete', 'complete'], // Buat request & Konfirmasi terima
  usage_reports: ['create', 'read'], // Lapor praktikum
})

// Export instance AC
export { ac }

/**
 * 4. TYPE DEFINITIONS
 * Penting untuk autocompletion di komponen Auth Guard (Frontend/Backend)
 */

export type Resource = keyof typeof statement

// Action manual agar type-safety lebih ketat
export type Action =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'ban'
  | 'impersonate'
  // Custom Actions
  | 'adjust' // Stock Opname
  | 'audit' // Audit Aset Fisik
  | 'approve_unit' // Acc Kajur
  | 'approve_faculty' // Acc Dekanat
  | 'fulfill' // Proses Gudang
  | 'complete' // Konfirmasi Terima
  | 'approve' // Acc Procurement
  | 'receive' // Terima Barang Vendor

// Wajib sama persis dengan Enum di Database (user_role_enum)
export type Role = 'super_admin' | 'warehouse_staff' | 'faculty_admin' | 'unit_admin' | 'unit_staff'
