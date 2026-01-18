import { requireAuth } from '@/lib/auth-guard'

import { SuperAdminDashboard } from './_components/super-admin-dashboard'
import { UnitAdminDashboard } from './_components/unit-admin-dashboard'
import { UnitStaffDashboard } from './_components/unit-staff-dashboard'
import { WarehouseStaffDashboard } from './_components/warehouse-staff-dashboard'

export default async function DashboardPage() {
  const session = await requireAuth({
    roles: ['super_admin', 'faculty_admin', 'unit_admin', 'unit_staff', 'warehouse_staff'],
  })

  if (session.user.role === 'warehouse_staff') {
    return <WarehouseStaffDashboard user={session.user} />
  }

  if (session.user.role === 'unit_admin') {
    return <UnitAdminDashboard user={session.user} />
  }

  if (session.user.role === 'unit_staff') {
    return <UnitStaffDashboard user={session.user} />
  }

  return <SuperAdminDashboard user={session.user} />
}
