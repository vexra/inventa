'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface RoomFilterProps {
  rooms: { id: string; name: string }[]
}

export function RoomFilter({ rooms }: RoomFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentRoomId = searchParams.get('roomId') || 'all'

  const handleValueChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())

    params.set('page', '1')

    if (value === 'all') {
      params.delete('roomId')
    } else {
      params.set('roomId', value)
    }

    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <Select value={currentRoomId} onValueChange={handleValueChange}>
      <SelectTrigger className="w-full sm:w-50">
        <SelectValue placeholder="Semua Ruangan" />
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
