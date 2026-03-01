'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

import { Activity } from 'lucide-react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface StatusFilterProps {
  currentFilter?: string
}

export function StatusFilter({ currentFilter }: StatusFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleStatusChange = (status: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (status === 'all') {
      params.delete('status')
    } else {
      params.set('status', status)
    }
    params.set('page', '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <Select value={currentFilter || 'all'} onValueChange={handleStatusChange}>
      <SelectTrigger className="w-[180px]">
        <Activity className="mr-2 h-4 w-4" />
        <SelectValue placeholder="Status Aset" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Semua Status</SelectItem>
        <SelectItem value="in_store">Di Tempat</SelectItem>
        <SelectItem value="in_use">Dipakai</SelectItem>
        <SelectItem value="in_transit">Dalam Pengiriman</SelectItem>
        <SelectItem value="damaged">Rusak</SelectItem>
      </SelectContent>
    </Select>
  )
}
