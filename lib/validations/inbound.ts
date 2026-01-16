import { z } from 'zod'

import { receiptConditionEnum } from '@/db/schema'

export const receiptItemSchema = z.object({
  itemId: z.string().min(1, 'ID Item diperlukan'),
  consumableId: z.string().min(1, 'ID Barang diperlukan'),

  quantity: z.coerce
    .number({ error: 'Jumlah harus berupa angka' })
    .min(0.01, 'Jumlah diterima harus lebih dari 0'),

  condition: z.enum(receiptConditionEnum.enumValues, {
    error: 'Pilih kondisi barang',
  }),

  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  notes: z.string().optional(),
})

export const goodsReceiptSchema = z.object({
  procurementId: z.string().min(1, 'ID Pengadaan tidak valid'),
  items: z.array(receiptItemSchema).min(1, 'Minimal satu barang harus diproses'),
})

export type GoodsReceiptFormValues = z.infer<typeof goodsReceiptSchema>
