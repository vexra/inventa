import {
  Archive,
  Boxes,
  Building,
  Layers,
  CalendarDays,
  Building2,
  ClipboardList,
  Component,
  FileClock,
  FilePenLine,
  FileText,
  FlaskConical,
  Landmark,
  LayoutDashboard,
  type LucideIcon,
  MapPin,
  Monitor,
  MonitorSmartphone,
  PackageCheck,
  ShoppingCart,
  Tags,
  Users,
  Warehouse,
  Wrench,
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
      items: [
        {
          title: 'Dashboard',
          url: '/dashboard',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: 'Master Organisasi',
      items: [
        { title: 'Fakultas', url: '/dashboard/faculties', icon: Building },
        { title: 'Unit Kerja', url: '/dashboard/units', icon: Building2 },
        { title: 'Gedung & Fasilitas', url: '/dashboard/buildings', icon: Landmark },
        { title: 'Daftar Ruangan', url: '/dashboard/rooms', icon: MapPin },
        { title: 'Daftar Gudang', url: '/dashboard/warehouses', icon: Warehouse },
      ],
    },
    {
      title: 'Master Katalog',
      items: [
        { title: 'Kategori Barang', url: '/dashboard/categories', icon: Tags },
        { title: 'Barang Habis Pakai', url: '/dashboard/consumables', icon: FlaskConical },
        { title: 'Model Aset', url: '/dashboard/asset-models', icon: Component },
      ],
    },
    {
      title: 'Fasilitas & Pemeliharaan', 
      items: [
        { title: 'Pemeliharaan Aset', url: '/dashboard/maintenances', icon: Wrench },
      ],
    },
    {
      title: 'Sistem & Keamanan',
      items: [
        { title: 'Manajemen User', url: '/dashboard/users', icon: Users },
        { title: 'Sesi Login', url: '/dashboard/sessions', icon: MonitorSmartphone },
        { title: 'Log Sistem', url: '/dashboard/activity-logs', icon: FileClock },
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
        { title: 'Pemeliharaan Aset', 
          url: '/dashboard/maintenances', 
          icon: Wrench 
        },
        { title: 'Katalog Model Aset', 
          url: '/dashboard/asset-models', 
          icon: Layers 
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
      items: [
        {
          title: 'Dashboard',
          url: '/dashboard',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: 'Pengajuan',
      items: [
        {
          title: 'Permintaan Barang',
          url: '/dashboard/consumable-requests',
          icon: ShoppingCart,
        },
        { title: 'Lapor Kerusakan', 
          url: '/dashboard/maintenances', 
          icon: Wrench 
        },
      ],
    },
    {
      title: 'Inventaris Ruangan',
      items: [
        {
          title: 'Stok BHP',
          url: '/dashboard/room-stocks',
          icon: Boxes,
        },
        {
          title: 'Aset Tetap',
          url: '/dashboard/room-assets',
          icon: Monitor,
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
      items: [
        {
          title: 'Log Aktivitas',
          url: '/dashboard/activity-logs',
          icon: FileClock,
        },
      ],
    },
  ],

  unit_admin: [
    {
      title: 'Utama',
      items: [
        {
          title: 'Dashboard',
          url: '/dashboard',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: 'Pengajuan',
      items: [
        {
          title: 'Permintaan Barang',
          url: '/dashboard/consumable-requests',
          icon: ClipboardList,
        },
      ],
    },
    {
      title: 'Inventaris & Aset',
      items: [
        {
          title: 'Stok BHP',
          url: '/dashboard/room-stocks',
          icon: Boxes,
        },
        {
          title: 'Aset Tetap',
          url: '/dashboard/unit-assets',
          icon: Monitor,
        },
        {
          title: 'Laporan Pemakaian',
          url: '/dashboard/usage-reports',
          icon: FilePenLine,
        },
      ],
    },
    {
      title: 'Manajemen Fasilitas',
      items: [
        {
          title: 'Daftar Ruangan',
          url: '/dashboard/rooms',
          icon: MapPin,
        },
        { title: 'Status Perbaikan', 
          url: '/dashboard/maintenances', 
          icon: Wrench 
        },
      ],
    },
    {
      title: 'Akun',
      items: [
        {
          title: 'Log Aktivitas',
          url: '/dashboard/activity-logs',
          icon: FileClock,
        },
      ],
    },
  ],

  faculty_admin: [
    {
      title: 'Utama',
      items: [
        {
          title: 'Dashboard',
          url: '/dashboard',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: 'Logistik & Pengadaan',
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
      title: 'Monitoring Inventaris',
      items: [
        {
          title: 'Aset Tetap',
          url: '/dashboard/fixed-assets',
          icon: Layers,
        },
        { title: 'Pemeliharaan Aset', 
          url: '/dashboard/maintenances', 
          icon: Wrench 
        },
        {
          title: 'Stok Gudang',
          url: '/dashboard/warehouse-stocks',
          icon: Archive,
        },
        {
          title: 'Stok Ruangan',
          url: '/dashboard/room-stocks',
          icon: Boxes,
        },
        {
          title: 'Aset Tetap',
          url: '/dashboard/fixed-assets',
          icon: Monitor,
        },
      ],
    },
    {
      title: 'Organisasi & Fasilitas',
      items: [
        {
          title: 'Unit Kerja',
          url: '/dashboard/units',
          icon: Users,
        },
        {
          title: 'Gudang',
          url: '/dashboard/warehouses',
          icon: Warehouse,
        },
        {
          title: 'Gedung',
          url: '/dashboard/buildings',
          icon: Landmark,
        },
        {
          title: 'Ruangan',
          url: '/dashboard/rooms',
          icon: MapPin,
        },
      ],
    },
    {
      title: 'Akun',
      items: [
        {
          title: 'Log Aktivitas',
          url: '/dashboard/activity-logs',
          icon: FileClock,
        },
      ],
    },
  ],
}
