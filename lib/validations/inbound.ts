import { z } from 'zod'

import { receiptConditionEnum } from '@/db/schema'

const goodsReceiptItemSchema = z.object({
  itemId: z.string(),
  consumableId: z.string(),
  quantity: z.number().min(0.1, 'Jumlah diterima harus lebih dari 0'),
  hasExpiry: z.boolean(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional().nullable(),
  condition: z.enum(receiptConditionEnum.enumValues),
  notes: z.string().optional(),
})

export const goodsReceiptSchema = z.object({
  procurementId: z.string(),
  items: z.array(goodsReceiptItemSchema).superRefine((items, ctx) => {
    items.forEach((item, index) => {
      if (item.hasExpiry) {
        if (!item.expiryDate) {
          ctx.addIssue({
            code: 'custom',
            message: 'Tanggal kadaluarsa wajib diisi',
            path: [index, 'expiryDate'],
          })
        }

        if (!item.batchNumber || item.batchNumber.trim() === '') {
          ctx.addIssue({
            code: 'custom',
            message: 'No. Batch wajib diisi untuk barang ini',
            path: [index, 'batchNumber'],
          })
        }
      }
    })
  }),
})

export type GoodsReceiptFormValues = z.infer<typeof goodsReceiptSchema>
