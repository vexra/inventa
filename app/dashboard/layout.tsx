import DashboardShell from '@/components/dashboard-shell'
import { requireAuth } from '@/lib/auth-guard'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAuth()

  return <DashboardShell>{children}</DashboardShell>
}
