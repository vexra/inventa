import {
  BarChart,
  Box,
  FileText,
  LayoutDashboard,
  Settings,
  Shield,
  ShoppingBag,
  Truck,
  Users,
} from 'lucide-react'

import { userRoleEnum } from '@/db/schema'

export type UserRole = (typeof userRoleEnum.enumValues)[number]

type NavItem = {
  title: string
  url: string
  icon: any
  items?: { title: string; url: string }[]
}

export const roleNavItems: Record<UserRole, { title: string; items: NavItem[] }[]> = {
  Administrator: [
    {
      title: 'General',
      items: [
        { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
        { title: 'Users', url: '/dashboard/users', icon: Users },
        { title: 'Apps', url: '/dashboard/apps', icon: Box },
      ],
    },
    {
      title: 'Management',
      items: [
        { title: 'Roles & Permissions', url: '/dashboard/roles', icon: Shield },
        { title: 'Settings', url: '/dashboard/settings', icon: Settings },
      ],
    },
  ],
  'Warehouse Admin': [
    {
      title: 'Inventory',
      items: [
        { title: 'Stock Overview', url: '/warehouse', icon: Box },
        { title: 'Inbound/Outbound', url: '/warehouse/logs', icon: Truck },
      ],
    },
  ],
  'Unit Staff': [
    {
      title: 'Unit Operations',
      items: [{ title: 'My Requests', url: '/unit/requests', icon: FileText }],
    },
  ],
  Executive: [
    {
      title: 'Reports',
      items: [
        { title: 'Analytics', url: '/exec/analytics', icon: BarChart },
        { title: 'Revenue', url: '/exec/revenue', icon: ShoppingBag },
      ],
    },
  ],
}
