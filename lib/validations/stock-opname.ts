import { z } from 'zod'

export const stockOpnameSchema = z.object({
  warehouseStockId: z.string().min(1, 'Batch harus dipilih'),
  consumableId: z.string(),
  physicalQty: z.coerce.number().min(0, 'Jumlah tidak boleh negatif'),
  type: z.enum(['STOCK_OPNAME', 'DAMAGE', 'LOSS', 'CORRECTION'], {
    error: 'Pilih tipe penyesuaian',
  }),
  reason: z.string().min(3, 'Alasan wajib diisi (min. 3 karakter)'),
})

export type StockOpnameFormValues = z.infer<typeof stockOpnameSchema>
