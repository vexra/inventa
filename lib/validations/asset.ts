import { z } from 'zod'
import { assetConditionEnum } from '@/db/schema'

// Define enum values explicitly for Zod validation
const assetConditionValues = assetConditionEnum.enumValues as [string, ...string[]]

export const assetModelSchema = z.object({
  categoryId: z.string().min(1, 'Kategori wajib dipilih'),
  brandId: z.string().min(1, 'Merek wajib dipilih'),
  name: z.string().min(3, 'Nama model minimal 3 karakter').trim(),
  modelNumber: z.string().trim().optional(),

  // Jenis Aset: Bergerak atau Tidak Bergerak
  isMovable: z.boolean().default(false),

  specifications: z.record(z.string(), z.any()).optional(),

  description: z.string().optional(),
})

export type AssetModelFormValues = z.infer<typeof assetModelSchema>

export const fixedAssetSchema = z.object({
  modelId: z.string().min(1, 'Model aset wajib dipilih'),

  roomId: z.string().optional(),
  warehouseId: z.string().optional(),

  inventoryNumber: z.string().min(3, 'Nomor inventaris wajib diisi').trim(),
  qrToken: z.string().optional(),
  serialNumber: z.string().trim().optional(),

  isMovable: z.boolean(),
  condition: z.enum(assetConditionValues, {
    message: 'Kondisi aset tidak valid',
  }),

  procurementYear: z.coerce.number().min(1900, 'Tahun tidak valid').optional(),
  price: z.coerce.number().min(0, 'Harga tidak boleh negatif').optional(),
  purchaseDate: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (!data.roomId && !data.warehouseId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Aset harus dialokasikan ke Ruangan atau Gudang',
      path: ['roomId'],
    })
  }
})

export type FixedAssetFormValues = z.infer<typeof fixedAssetSchema>
