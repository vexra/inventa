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
}

type NavGroup = {
  title: string
  items: NavItem[]
}

export const roleNavItems: Record<UserRole, NavGroup[]> = {
  administrator: [
    {
      title: 'Umum',
      items: [{ title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard }],
    },
    {
      title: 'Data Master',
      items: [
        { title: 'Gudang', url: '/dashboard/warehouses', icon: Warehouse },
        { title: 'Unit Kerja', url: '/dashboard/units', icon: Building2 },
        { title: 'Barang', url: '/dashboard/items', icon: Package },
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
  warehouse_staff: [
    {
      title: 'Inventaris',
      items: [
        { title: 'Stok Gudang', url: '/warehouse', icon: Box },
        { title: 'Riwayat Keluar/Masuk', url: '/warehouse/logs', icon: Truck },
      ],
    },
  ],
  unit_staff: [
    {
      title: 'Operasional Unit',
      items: [{ title: 'Permintaan Saya', url: '/unit/requests', icon: FileText }],
    },
  ],
  executive: [
    {
      title: 'Laporan',
      items: [
        { title: 'Analisis', url: '/exec/analytics', icon: BarChart },
        { title: 'Ringkasan Keuangan', url: '/exec/revenue', icon: ShoppingBag },
      ],
    },
  ],
}
