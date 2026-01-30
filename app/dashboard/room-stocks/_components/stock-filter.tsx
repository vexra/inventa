'use client'

import { useRouter, useSearchParams } from 'next/navigation'

import { Filter } from 'lucide-react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function StockFilter({ currentFilter }: { currentFilter: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete('status')
    } else {
      params.set('status', value)
    }
    params.set('page', '1')
    router.push(`?${params.toString()}`)
  }

  return (
    <Select value={currentFilter} onValueChange={handleChange}>
      <SelectTrigger className="bg-background h-9 w-40">
        <div className="flex items-center gap-2">
          <Filter className="text-muted-foreground h-3.5 w-3.5" />
          <SelectValue placeholder="Status Stok" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Semua Status</SelectItem>
        <SelectItem value="low">Stok Menipis</SelectItem>
        <SelectItem value="out">Stok Habis</SelectItem>
      </SelectContent>
    </Select>
  )
}
