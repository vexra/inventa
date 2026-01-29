import {
  Boxes,
  Building,
  Building2,
  ClipboardList,
  FileClock,
  FilePenLine,
  FileText,
  FlaskConical,
  Landmark,
  Layers,
  LayoutDashboard,
  type LucideIcon,
  MapPin,
  MonitorSmartphone,
  Package,
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
        { title: 'Gedung', url: '/dashboard/buildings', icon: Landmark },
        { title: 'Ruangan', url: '/dashboard/rooms', icon: MapPin },
        { title: 'Gudang', url: '/dashboard/warehouses', icon: Warehouse },
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
          title: 'Permintaan Barang',
          url: '/dashboard/consumable-requests',
          icon: ClipboardList,
        },
        {
          title: 'Stock Opname',
          url: '/dashboard/stock-opname',
          icon: PackageCheck,
        },
        {
          title: 'Pengadaan Barang',
          url: '/dashboard/procurements',
          icon: FileText,
        },
      ],
    },
    {
      title: 'Data Inventaris',
      items: [
        {
          title: 'Stok BHP Gudang',
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
          title: 'Permintaan Barang',
          url: '/dashboard/consumable-requests',
          icon: ShoppingCart,
        },
      ],
    },
    {
      title: 'Inventaris Ruangan',
      items: [
        {
          title: 'Stok BHP Ruangan',
          url: '/dashboard/room-stocks',
          icon: Boxes,
        },
        {
          title: 'Aset Ruangan',
          url: '/dashboard/room-assets',
          icon: Layers,
        },
        {
          title: 'Laporan Pemakaian',
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
      title: 'Manajemen Permintaan',
      items: [
        {
          title: 'Permintaan Barang',
          url: '/dashboard/consumable-requests',
          icon: ClipboardList,
        },
      ],
    },
    {
      title: 'Monitoring Unit',
      items: [
        {
          title: 'Stok BHP Ruangan',
          url: '/dashboard/room-stocks',
          icon: Boxes,
        },
        {
          title: 'Laporan Pemakaian',
          url: '/dashboard/usage-reports',
          icon: FilePenLine,
        },
        {
          title: 'Daftar Aset Unit',
          url: '/dashboard/unit-assets',
          icon: Layers,
        },
        {
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

  faculty_admin: [
    {
      title: 'Utama',
      items: [{ title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard }],
    },
    {
      title: 'Permintaan & Pengadaan',
      items: [
        {
          title: 'Permintaan Barang',
          url: '/dashboard/consumable-requests',
          icon: ClipboardList,
        },
        {
          title: 'Pengadaan Barang',
          url: '/dashboard/procurements',
          icon: ShoppingCart,
        },
      ],
    },
    {
      title: 'Monitoring Aset & Persediaan',
      items: [
        {
          title: 'Stok Gudang',
          url: '/dashboard/warehouse-stocks',
          icon: Boxes,
        },
        {
          title: 'Stok Ruangan',
          url: '/dashboard/room-stocks',
          icon: Package,
        },
        {
          title: 'Semua Aset Tetap',
          url: '/dashboard/fixed-assets',
          icon: Layers,
        },
      ],
    },
    {
      title: 'Organisasi & Lokasi',
      items: [
        {
          title: 'Unit Kerja',
          url: '/dashboard/units',
          icon: Users,
        },
        {
          title: 'Gedung & Fasilitas',
          url: '/dashboard/buildings',
          icon: Landmark,
        },
        {
          title: 'Ruangan',
          url: '/dashboard/rooms',
          icon: MapPin,
        },
        {
          title: 'Gudang',
          url: '/dashboard/warehouses',
          icon: Warehouse,
        },
      ],
    },
    {
      title: 'Akun',
      items: [{ title: 'Log Aktivitas', url: '/dashboard/activity-logs', icon: FileClock }],
    },
  ],
}
