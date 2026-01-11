'use client'

import { useTransition } from 'react'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Search } from 'lucide-react'
import { useDebouncedCallback } from 'use-debounce'

import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

interface SearchInputProps {
  placeholder?: string
  className?: string
}

export function SearchInput({ placeholder = 'Cari...', className }: SearchInputProps) {
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
    // PERBAIKAN:
    // 1. Saya hapus 'flex flex-1 shrink-0' agar tidak memaksa lebar penuh.
    // 2. Saya tambahkan 'cn(..., className)' agar Anda bisa mengatur lebar lewat props.
    <div className={cn('relative', className)}>
      <label htmlFor="search" className="sr-only">
        Cari
      </label>
      <Input
        // Input mengikuti lebar wrapper (div parent)
        className="w-full pl-10"
        placeholder={placeholder}
        onChange={(e) => handleSearch(e.target.value)}
        defaultValue={searchParams.get('q')?.toString()}
      />
      <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />

      {isPending && (
        <div className="absolute top-1/2 right-3 -translate-y-1/2">
          <Spinner className="h-4 w-4" />
        </div>
      )}
    </div>
  )
}
