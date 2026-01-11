import { z } from 'zod'

export const warehouseSchema = z.object({
  name: z.string().min(1, 'Nama gudang wajib diisi').trim(),
  type: z.enum(['CHEMICAL', 'GENERAL_ATK'], { error: 'Tipe gudang wajib dipilih' }),
  facultyId: z.string().min(1, 'Fakultas wajib dipilih'),
  description: z.string().trim().optional(),
})

export type WarehouseFormValues = z.infer<typeof warehouseSchema>
