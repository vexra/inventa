'use client'

import * as React from 'react'

import { useRouter, useSearchParams } from 'next/navigation'

import { Check, ChevronsUpDown, School, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface UnitSelectorProps {
  units: { id: string; name: string }[]
  currentUnitId?: string
}

export function UnitSelector({ units, currentUnitId }: UnitSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = React.useState(false)

  const handleSelect = (unitId: string) => {
    const params = new URLSearchParams(searchParams.toString())

    params.set('unitId', unitId)

    params.set('page', '1')

    params.delete('roomId')

    router.push(`?${params.toString()}`)
    setOpen(false)
  }

  const selectedUnit = units.find((u) => u.id === currentUnitId)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="bg-background w-45 justify-between px-3 font-normal"
        >
          <div className="flex items-center gap-2 truncate">
            <School className="text-muted-foreground h-4 w-4 shrink-0" />
            <span className="truncate">{selectedUnit ? selectedUnit.name : 'Pilih Unit...'}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-45 p-0" align="start">
        <Command>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput placeholder="Cari unit..." className="h-9 border-none focus:ring-0" />
          </div>
          <CommandList>
            <CommandEmpty className="text-muted-foreground py-6 text-center text-sm">
              Unit tidak ditemukan.
            </CommandEmpty>
            <CommandGroup heading="Daftar Unit">
              {units.map((unit) => {
                const isSelected = currentUnitId === unit.id
                return (
                  <CommandItem
                    key={unit.id}
                    value={unit.name}
                    onSelect={() => handleSelect(unit.id)}
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
                    <span className="truncate">{unit.name}</span>
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
