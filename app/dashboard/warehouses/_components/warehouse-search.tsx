'use client'

import { useTransition } from 'react'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Search } from 'lucide-react'
import { useDebouncedCallback } from 'use-debounce'

import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

export function WarehouseSearch() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', '1')

    if (term) {
      params.set('q', term)
    } else {
      params.delete('q')
    }

    startTransition(() => {
      replace(`${pathname}?${params.toString()}`)
    })
  }, 300)

  return (
    <div className="relative flex flex-1 shrink-0">
      <label htmlFor="search" className="sr-only">
        Cari Gudang
      </label>
      <Input
        className="w-full pl-10 md:w-75"
        placeholder="Cari nama atau lokasi..."
        onChange={(e) => handleSearch(e.target.value)}
        defaultValue={searchParams.get('q')?.toString()}
      />
      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />

      {isPending && (
        <div className="absolute top-1/2 right-3 -translate-y-1/2">
          <Spinner className="h-4 w-4" />
        </div>
      )}
    </div>
  )
}
