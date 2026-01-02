import {
  BarChart,
  Box,
  Building2,
  FileClock,
  FileText,
  History,
  LayoutDashboard,
  type LucideIcon,
  Package,
  Shield,
  ShoppingBag,
  Tags,
  Truck,
  Users,
  Warehouse,
} from 'lucide-react'

import { userRoleEnum } from '@/db/schema'

export type UserRole = (typeof userRoleEnum.enumValues)[number]

type NavItem = {
  title: string
  url: string
  icon: LucideIcon
  items?: { title: string; url: string }[]
}

export const roleNavItems: Record<UserRole, { title: string; items: NavItem[] }[]> = {
  Administrator: [
    {
      title: 'Umum',
      items: [{ title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard }],
    },
    {
      title: 'Data Master',
      items: [
        { title: 'Data Gudang', url: '/dashboard/warehouses', icon: Warehouse },
        { title: 'Unit Kerja', url: '/dashboard/units', icon: Building2 },
        { title: 'Data Barang', url: '/dashboard/items', icon: Package },
        { title: 'Kategori', url: '/dashboard/categories', icon: Tags },
      ],
    },
    {
      title: 'Manajemen Pengguna',
      items: [
        { title: 'Daftar Pengguna', url: '/dashboard/users', icon: Users },
        { title: 'Hak Akses & Role', url: '/dashboard/roles', icon: Shield },
      ],
    },
    {
      title: 'Sistem & Audit',
      items: [
        { title: 'Log Aktivitas', url: '/dashboard/logs/activity', icon: FileClock },
        { title: 'Riwayat Audit', url: '/dashboard/logs/audit', icon: History },
      ],
    },
  ],

  'Warehouse Admin': [
    {
      title: 'Inventaris',
      items: [
        { title: 'Stok Gudang', url: '/warehouse', icon: Box },
        { title: 'Riwayat Keluar/Masuk', url: '/warehouse/logs', icon: Truck },
      ],
    },
  ],

  'Unit Staff': [
    {
      title: 'Operasional Unit',
      items: [{ title: 'Permintaan Saya', url: '/unit/requests', icon: FileText }],
    },
  ],

  Executive: [
    {
      title: 'Laporan',
      items: [
        { title: 'Analisis', url: '/exec/analytics', icon: BarChart },
        { title: 'Ringkasan Keuangan', url: '/exec/revenue', icon: ShoppingBag },
      ],
    },
  ],
}
