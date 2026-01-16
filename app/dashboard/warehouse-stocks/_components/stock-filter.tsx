'use client'

import { useRouter, useSearchParams } from 'next/navigation'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

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
    <Tabs value={currentFilter} onValueChange={handleChange} className="w-auto">
      <TabsList>
        <TabsTrigger value="all">Semua</TabsTrigger>
        <TabsTrigger value="low">Menipis</TabsTrigger>
        <TabsTrigger value="out">Habis</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
