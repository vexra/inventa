'use client'

import React from 'react'

import Link from 'next/link'
// Import Link dari Next.js
import { usePathname } from 'next/navigation'

// Import usePathname untuk ambil URL
import { Search } from 'lucide-react'

import { AppSidebar } from '@/components/app-sidebar'
import { ModeToggle } from '@/components/mode-toggle'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { UserNav } from '@/components/user-nav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // 1. Pecah URL menjadi array segmen (misal: /dashboard/users -> ['dashboard', 'users'])
  const pathSegments = pathname.split('/').filter((segment) => segment !== '')

  // 2. Helper untuk kapitalisasi huruf pertama (dashboard -> Dashboard)
  const capitalize = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* --- NAVBAR --- */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          {/* Bagian Kiri: Sidebar Trigger & Breadcrumb */}
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />

            <Breadcrumb>
              <BreadcrumbList>
                {pathSegments.map((segment, index) => {
                  // Buat URL href untuk breadcrumb ini
                  const href = `/${pathSegments.slice(0, index + 1).join('/')}`

                  // Cek apakah ini segmen terakhir (Halaman saat ini)
                  const isLast = index === pathSegments.length - 1

                  // Format judul
                  const title = capitalize(segment)

                  return (
                    <React.Fragment key={href}>
                      <BreadcrumbItem className="hidden md:block">
                        {isLast ? (
                          // Jika terakhir, render sebagai Teks biasa (Page)
                          <BreadcrumbPage>{title}</BreadcrumbPage>
                        ) : (
                          // Jika bukan terakhir, render sebagai Link
                          // asChild penting agar BreadcrumbLink menggunakan Next Link di dalamnya
                          <BreadcrumbLink asChild>
                            <Link href={href}>{title}</Link>
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>

                      {/* Tampilkan separator (/) jika bukan item terakhir */}
                      {!isLast && <BreadcrumbSeparator className="hidden md:block" />}
                    </React.Fragment>
                  )
                })}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Bagian Kanan: Search, Theme, Profile */}
          <div className="flex items-center gap-4">
            <div className="relative hidden items-center md:flex">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
              <Input
                type="search"
                placeholder="Cari sesuatu..."
                className="bg-background h-9 w-64 rounded-xl border pr-12 pl-9 shadow-sm"
              />
              <div className="bg-muted text-muted-foreground pointer-events-none absolute top-2 right-2 flex h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none">
                <span className="text-xs">⌘</span>K
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ModeToggle />
              <UserNav />
            </div>
          </div>
        </header>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="bg-muted/10 flex min-h-screen flex-1 flex-col gap-4 p-4 pt-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
