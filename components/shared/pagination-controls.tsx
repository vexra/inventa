'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface PaginationControlsProps {
  totalPages: number
  showCount?: boolean // Opsi untuk menampilkan teks "Halaman X dari Y"
}

export function PaginationControls({ totalPages, showCount = true }: PaginationControlsProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { replace } = useRouter()

  // Ambil page dari URL, default ke 1
  const currentPage = Number(searchParams.get('page')) || 1

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', pageNumber.toString())
    return `${pathname}?${params.toString()}`
  }

  // Jangan render jika hanya ada 1 halaman (opsional, sesuaikan preferensi)
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-end space-x-2 py-4">
      {showCount && (
        <div className="text-muted-foreground mr-4 text-sm">
          Halaman {currentPage} dari {totalPages}
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => replace(createPageURL(currentPage - 1))}
        disabled={currentPage <= 1}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Previous Page</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => replace(createPageURL(currentPage + 1))}
        disabled={currentPage >= totalPages}
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Next Page</span>
      </Button>
    </div>
  )
}
