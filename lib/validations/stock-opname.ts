import * as z from 'zod'

export const stockOpnameSchema = z.object({
  warehouseStockId: z.string(),
  consumableId: z.string(),
  physicalQty: z.coerce
    .number({ error: 'Jumlah fisik harus diisi' })
    .min(0, 'Jumlah tidak boleh minus'),
  reason: z.string().min(3, 'Alasan penyesuaian harus diisi (min. 3 karakter)'),
})

export type StockOpnameFormValues = z.infer<typeof stockOpnameSchema>
