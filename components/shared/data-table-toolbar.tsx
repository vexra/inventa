'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { ChevronDown, Search } from 'lucide-react'
import { useDebouncedCallback } from 'use-debounce'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'

interface DataTableToolbarProps {
  placeholder?: string
  limit?: number
  children?: React.ReactNode
}

export function DataTableToolbar({
  placeholder = 'Cari data...',
  limit = 10,
  children,
}: DataTableToolbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const createQueryString = (params: Record<string, string | number | null>) => {
    const newParams = new URLSearchParams(searchParams.toString())
    Object.entries(params).forEach(([key, value]) => {
      if (value === null) newParams.delete(key)
      else newParams.set(key, String(value))
    })
    return newParams.toString()
  }

  const handleSearch = useDebouncedCallback((term: string) => {
    router.push(`${pathname}?${createQueryString({ q: term, page: 1 })}`, { scroll: false })
  }, 300)

  const handleLimitChange = (value: string) => {
    router.push(`${pathname}?${createQueryString({ limit: value, page: 1 })}`, { scroll: false })
  }

  return (
    <div className="flex flex-col items-center justify-between gap-4 border-b p-4 sm:flex-row">
      <div className="relative w-full sm:max-w-xs">
        <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
        <Input
          placeholder={placeholder}
          className="h-9 w-full pl-9 text-sm"
          onChange={(e) => handleSearch(e.target.value)}
          defaultValue={searchParams.get('q')?.toString()}
        />
      </div>

      <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 w-17.5 justify-between px-2">
              <span>{limit}</span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-37.5">
            <DropdownMenuLabel>Jumlah Baris</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={String(limit)} onValueChange={handleLimitChange}>
              <DropdownMenuRadioItem value="10">10 Data</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="20">20 Data</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="50">50 Data</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="100">100 Data</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {children}
      </div>
    </div>
  )
}
