'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

import { Building2 } from 'lucide-react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface RoomFilterProps {
  rooms: { id: string; name: string }[]
  currentRoomId?: string
}

export function RoomFilter({ rooms, currentRoomId }: RoomFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleRoomChange = (roomId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (roomId === 'all') {
      params.delete('roomId')
    } else {
      params.set('roomId', roomId)
    }
    params.set('page', '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <Select value={currentRoomId || 'all'} onValueChange={handleRoomChange}>
      <SelectTrigger className="w-[200px]">
        <Building2 className="mr-2 h-4 w-4" />
        <SelectValue placeholder="Pilih Ruangan" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Semua Ruangan</SelectItem>
        {rooms.map((room) => (
          <SelectItem key={room.id} value={room.id}>
            {room.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
