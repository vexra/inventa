import {
  ArrowDownToLine,
  Boxes,
  Building,
  Building2,
  ClipboardList,
  FileClock,
  FileText,
  FlaskConical,
  History,
  Layers,
  LayoutDashboard,
  type LucideIcon,
  MapPin,
  MonitorSmartphone,
  PackageCheck,
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
          title: 'Penerimaan Barang',
          url: '/dashboard/inbound',
          icon: ArrowDownToLine,
        },
        {
          title: 'Stock Opname',
          url: '/dashboard/stock-opname',
          icon: PackageCheck,
        },
        {
          title: 'Pengajuan Restock',
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
        {
          title: 'Riwayat Transaksi',
          url: '/dashboard/transactions',
          icon: History,
        },
      ],
    },
  ],

  faculty_admin: [],
  unit_admin: [],
  unit_staff: [],
}
