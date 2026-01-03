import { z } from 'zod'

export const warehouseSchema = z.object({
  name: z.string().min(1, 'Nama gudang wajib diisi'),
  location: z.string().optional(),
})

export type WarehouseFormValues = z.infer<typeof warehouseSchema>
