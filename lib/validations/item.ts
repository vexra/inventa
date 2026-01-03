import { z } from 'zod'

export const itemSchema = z.object({
  name: z.string().min(1, 'Nama barang wajib diisi'),
  categoryId: z.string().min(1, 'Kategori wajib dipilih'),
  sku: z.string().optional(),
  baseUnit: z.string().min(1, 'Satuan dasar wajib diisi (misal: Pcs, Box)'),
  minStockAlert: z.coerce.number().min(0).default(0),
  description: z.string().optional(),
  hasExpiry: z.boolean().default(false),
  isActive: z.boolean().default(true),
  image: z.string().optional(),
})

export type ItemFormValues = z.infer<typeof itemSchema>
