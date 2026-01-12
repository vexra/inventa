import { z } from 'zod'

export const consumableSchema = z.object({
  name: z.string().min(2, 'Nama barang minimal 2 karakter'),
  sku: z.string().min(3, 'SKU minimal 3 karakter'),
  categoryId: z.string().min(1, 'Kategori wajib dipilih'),
  baseUnit: z.string().min(1, 'Satuan wajib diisi (misal: Pcs, Box)'),
  minimumStock: z.coerce.number().min(0, 'Stok minimum tidak boleh negatif'),
  hasExpiry: z.boolean().default(false),
  description: z.string().optional(),
})

export type ConsumableFormValues = z.infer<typeof consumableSchema>
