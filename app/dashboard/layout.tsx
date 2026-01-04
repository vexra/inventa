import DashboardShell from '@/components/dashboard-shell'
import { requireAuth } from '@/lib/auth-guard'

// Import Client Component tadi

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // 1. PROTEKSI SISI SERVER
  // Code ini jalan di server sebelum halaman dikirim ke browser.
  // Jika user belum login, mereka mental ke /sign-in
  await requireAuth()

  // 2. Render UI Client
  return <DashboardShell>{children}</DashboardShell>
}
