'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface DataTablePaginationProps {
  metadata: {
    totalItems: number
    currentPage: number
    itemsPerPage: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export function DataTablePagination({ metadata }: DataTablePaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(newPage))
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const startEntry = (metadata.currentPage - 1) * metadata.itemsPerPage + 1
  const endEntry = Math.min(metadata.currentPage * metadata.itemsPerPage, metadata.totalItems)

  return (
    <div className="bg-muted/20 flex items-center justify-between border-t p-4">
      <div className="text-muted-foreground text-xs">
        {metadata.totalItems > 0 ? (
          <>
            Menampilkan <strong>{startEntry}</strong> - <strong>{endEntry}</strong> dari{' '}
            <strong>{metadata.totalItems}</strong> data
          </>
        ) : (
          'Tidak ada data'
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => handlePageChange(metadata.currentPage - 1)}
          disabled={!metadata.hasPrevPage}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="w-6 text-center text-xs font-medium">{metadata.currentPage}</div>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => handlePageChange(metadata.currentPage + 1)}
          disabled={!metadata.hasNextPage}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
