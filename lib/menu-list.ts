import {
  Boxes,
  Building,
  Building2,
  ClipboardList,
  FileCheck,
  FileClock,
  FilePenLine,
  FileText,
  FlaskConical,
  Layers,
  LayoutDashboard,
  type LucideIcon,
  MapPin,
  MonitorSmartphone,
  PackageCheck,
  ShoppingCart,
  Tags,
  Users,
  Warehouse,
} from 'lucide-react'

import { userRoleEnum } from '@/db/schema'

export type UserRole = (typeof userRoleEnum.enumValues)[number]

type NavItem = {
  title: string
  url: string
  icon: LucideIcon
}

type NavGroup = {
  title: string
  items: NavItem[]
}

export const roleNavItems: Record<UserRole, NavGroup[]> = {
  super_admin: [
    {
      title: 'Utama',
      items: [{ title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard }],
    },
    {
      title: 'Organisasi & Lokasi',
      items: [
        { title: 'Fakultas', url: '/dashboard/faculties', icon: Building },
        { title: 'Unit Kerja', url: '/dashboard/units', icon: Building2 },
        { title: 'Gudang', url: '/dashboard/warehouses', icon: Warehouse },
        { title: 'Ruangan', url: '/dashboard/rooms', icon: MapPin },
      ],
    },
    {
      title: 'Katalog Barang',
      items: [
        { title: 'Kategori', url: '/dashboard/categories', icon: Tags },
        { title: 'Barang Habis Pakai', url: '/dashboard/consumables', icon: FlaskConical },
        { title: 'Model Aset', url: '/dashboard/asset-models', icon: Layers },
      ],
    },
    {
      title: 'Sistem & Audit',
      items: [
        { title: 'Pengguna', url: '/dashboard/users', icon: Users },
        { title: 'Sesi Login', url: '/dashboard/sessions', icon: MonitorSmartphone },
        { title: 'Log Aktivitas', url: '/dashboard/activity-logs', icon: FileClock },
      ],
    },
  ],

  warehouse_staff: [
    {
      title: 'Utama',
      items: [{ title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard }],
    },
    {
      title: 'Operasional Gudang',
      items: [
        {
          title: 'Permintaan Unit',
          url: '/dashboard/requests',
          icon: ClipboardList,
        },
        {
          title: 'Stock Opname',
          url: '/dashboard/stock-opname',
          icon: PackageCheck,
        },
        {
          title: 'Permohonan Pengadaan',
          url: '/dashboard/procurements',
          icon: FileText,
        },
      ],
    },
    {
      title: 'Data Inventaris',
      items: [
        {
          title: 'Stok Gudang',
          url: '/dashboard/warehouse-stocks',
          icon: Boxes,
        },
        {
          title: 'Katalog Barang',
          url: '/dashboard/consumables',
          icon: FlaskConical,
        },
      ],
    },
    {
      title: 'Akun',
      items: [{ title: 'Log Aktivitas', url: '/dashboard/activity-logs', icon: FileClock }],
    },
  ],

  unit_staff: [
    {
      title: 'Utama',
      items: [{ title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard }],
    },
    {
      title: 'Layanan Barang',
      items: [
        {
          title: 'Permintaan Saya',
          url: '/dashboard/my-requests',
          icon: ShoppingCart,
        },
      ],
    },
    {
      title: 'Inventaris Ruangan',
      items: [
        {
          title: 'Stok Ruangan',
          url: '/dashboard/room-stocks',
          icon: Boxes,
        },
        {
          title: 'Lapor Pemakaian',
          url: '/dashboard/usage-reports',
          icon: FilePenLine,
        },
      ],
    },
    {
      title: 'Akun',
      items: [{ title: 'Log Aktivitas', url: '/dashboard/activity-logs', icon: FileClock }],
    },
  ],

  unit_admin: [
    {
      title: 'Utama',
      items: [{ title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard }],
    },
    {
      title: 'Verifikasi & Approval',
      items: [
        {
          // Halaman untuk melihat request status 'PENDING_UNIT'
          title: 'Persetujuan Request',
          url: '/dashboard/approvals',
          icon: FileCheck,
        },
        {
          // History request semua staff di unit ini
          title: 'Riwayat Permintaan',
          url: '/dashboard/unit-requests',
          icon: ClipboardList,
        },
      ],
    },
    {
      title: 'Monitoring Inventaris',
      items: [
        {
          // Melihat stok gabungan seluruh ruangan di unit ini
          title: 'Stok per Ruangan',
          url: '/dashboard/unit-stocks',
          icon: Boxes,
        },
        {
          // Manajemen ruangan (jika admin boleh edit nama/QR ruangan)
          title: 'Daftar Ruangan',
          url: '/dashboard/rooms',
          icon: MapPin,
        },
      ],
    },
    {
      title: 'Akun',
      items: [{ title: 'Log Aktivitas', url: '/dashboard/activity-logs', icon: FileClock }],
    },
  ],

  faculty_admin: [],
}
