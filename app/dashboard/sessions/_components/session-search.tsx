'use client'

import { useTransition } from 'react'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Loader2, Search } from 'lucide-react'
import { useDebouncedCallback } from 'use-debounce'

import { Input } from '@/components/ui/input'

export function SessionSearch() {
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
    <div className="relative w-full md:w-72">
      <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
      <Input
        placeholder="Cari nama atau email..."
        className="pl-9"
        onChange={(e) => handleSearch(e.target.value)}
        defaultValue={searchParams.get('q')?.toString()}
      />
      {isPending && (
        <div className="absolute top-3 right-3">
          <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
        </div>
      )}
    </div>
  )
}
