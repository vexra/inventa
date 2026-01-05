'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface PaginationProps {
  totalPages: number
}

export function UserPagination({ totalPages }: PaginationProps) {
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
    <div className="flex items-center justify-end space-x-2 py-4">
      <div className="text-muted-foreground mr-4 text-sm">
        Halaman {currentPage} dari {totalPages}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => replace(createPageURL(currentPage - 1))}
        disabled={currentPage <= 1}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => replace(createPageURL(currentPage + 1))}
        disabled={currentPage >= totalPages}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
