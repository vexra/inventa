'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface PaginationProps {
  totalPages: number
}

export function SessionPagination({ totalPages }: PaginationProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { replace } = useRouter()

  const currentPage = Number(searchParams.get('page')) || 1

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', pageNumber.toString())
    return `${pathname}?${params.toString()}`
  }

  return (
    <div className="flex items-center gap-2">
      <div className="text-muted-foreground mr-2 text-sm">
        Halaman {currentPage} dari {totalPages}
      </div>
      <Button
        variant="outline"
        size="icon"
        disabled={currentPage <= 1}
        onClick={() => replace(createPageURL(currentPage - 1))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        disabled={currentPage >= totalPages}
        onClick={() => replace(createPageURL(currentPage + 1))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
