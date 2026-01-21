'use client'

import * as React from 'react'

import { useRouter, useSearchParams } from 'next/navigation'

import { Building2, Check, ChevronsUpDown, Search } from 'lucide-react'

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

interface WarehouseSelectorProps {
  warehouses: { id: string; name: string }[]
  currentWarehouseId?: string
}

export function WarehouseSelector({ warehouses, currentWarehouseId }: WarehouseSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = React.useState(false)

  const handleSelect = (warehouseId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('warehouseId', warehouseId)
    params.set('page', '1')
    router.push(`?${params.toString()}`)
    setOpen(false)
  }

  const selectedWarehouse = warehouses.find((w) => w.id === currentWarehouseId)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="bg-background border-input hover:bg-accent hover:text-accent-foreground h-10 w-full justify-between px-3 font-normal sm:w-60"
        >
          <div className="flex items-center gap-2 truncate">
            <Building2 className="text-muted-foreground h-4 w-4 shrink-0" />
            <span className={cn('truncate', !selectedWarehouse && 'text-muted-foreground')}>
              {selectedWarehouse ? selectedWarehouse.name : 'Pilih Gudang...'}
            </span>
          </div>
          <ChevronsUpDown className="text-muted-foreground ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-60 p-0" align="start">
        <Command>
          <div className="border-border flex items-center border-b px-3">
            <Search className="text-muted-foreground mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput placeholder="Cari gudang..." className="h-9 border-none focus:ring-0" />
          </div>
          <CommandList>
            <CommandEmpty className="text-muted-foreground py-6 text-center text-sm">
              Tidak ditemukan.
            </CommandEmpty>
            <CommandGroup>
              {warehouses.map((warehouse) => {
                const isSelected = currentWarehouseId === warehouse.id
                return (
                  <CommandItem
                    key={warehouse.id}
                    value={warehouse.name}
                    onSelect={() => handleSelect(warehouse.id)}
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

                    <span className="truncate">{warehouse.name}</span>
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
