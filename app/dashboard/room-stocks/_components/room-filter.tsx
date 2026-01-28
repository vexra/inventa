'use client'

import * as React from 'react'

import { useRouter, useSearchParams } from 'next/navigation'

import { Check, ChevronsUpDown, MapPin, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface RoomFilterProps {
  rooms: { id: string; name: string }[]
  currentRoomId?: string
}

export function RoomFilter({ rooms, currentRoomId }: RoomFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = React.useState(false)

  const handleSelect = (roomId: string | null) => {
    const params = new URLSearchParams(searchParams.toString())

    if (roomId) {
      params.set('roomId', roomId)
    } else {
      params.delete('roomId')
    }

    params.set('page', '1')

    router.push(`?${params.toString()}`)
    setOpen(false)
  }

  const selectedRoom = rooms.find((r) => r.id === currentRoomId)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="bg-background w-50 justify-between px-3 font-normal"
        >
          <div className="flex items-center gap-2 truncate">
            <MapPin className="text-muted-foreground h-4 w-4 shrink-0" />
            <span className="truncate">{selectedRoom ? selectedRoom.name : 'Semua Ruangan'}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-50 p-0" align="start">
        <Command>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput placeholder="Cari ruangan..." className="h-9 border-none focus:ring-0" />
          </div>
          <CommandList>
            <CommandEmpty className="text-muted-foreground py-6 text-center text-sm">
              Ruangan tidak ditemukan.
            </CommandEmpty>

            <CommandGroup>
              <CommandItem
                value="all_rooms_option"
                onSelect={() => handleSelect(null)}
                className="cursor-pointer"
              >
                <div className="flex w-8 shrink-0 items-center justify-center">
                  <Check
                    className={cn(
                      'text-primary h-4 w-4 transition-all',
                      !currentRoomId ? 'scale-100 opacity-100' : 'scale-75 opacity-0',
                    )}
                  />
                </div>
                <span>Semua Ruangan</span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Daftar Ruangan">
              {rooms.map((room) => {
                const isSelected = currentRoomId === room.id
                return (
                  <CommandItem
                    key={room.id}
                    value={room.name}
                    onSelect={() => handleSelect(room.id)}
                    className={cn(
                      'cursor-pointer pl-2',
                      isSelected ? 'bg-accent text-accent-foreground font-medium' : '',
                    )}
                  >
                    <div className="flex w-8 shrink-0 items-center justify-center">
                      <Check
                        className={cn(
                          'text-primary h-4 w-4 transition-all',
                          isSelected ? 'scale-100 opacity-100' : 'scale-75 opacity-0',
                        )}
                      />
                    </div>
                    <span className="truncate">{room.name}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
