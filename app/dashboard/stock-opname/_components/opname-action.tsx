'use client'

import { useState } from 'react'

import { ClipboardEdit } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { AdjustmentDialog } from '../_components/adjustment-dialog'

interface OpnameActionProps {
  consumable: {
    id: string
    name: string
    unit: string
  }
  batches: {
    id: string
    batchNumber: string | null
    quantity: number
    expiryDate: Date | null
  }[]
}

export function OpnameAction({ consumable, batches }: OpnameActionProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="w-full bg-blue-600 text-white hover:bg-blue-700 sm:w-auto"
      >
        <ClipboardEdit className="mr-2 h-4 w-4" />
        Lakukan Opname
      </Button>

      <AdjustmentDialog
        open={open}
        onOpenChange={setOpen}
        consumableId={consumable.id}
        consumableName={consumable.name}
        unit={consumable.unit}
        batches={batches}
      />
    </>
  )
}
