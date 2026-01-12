import {
  Building,
  Building2,
  FileClock,
  FlaskConical,
  Layers,
  LayoutDashboard,
  type LucideIcon,
  MapPin,
  MonitorSmartphone,
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

  warehouse_staff: [],
  faculty_admin: [],
  unit_admin: [],
  unit_staff: [],
}
