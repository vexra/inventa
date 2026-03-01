import { z } from 'zod'
import { maintenanceSeverityEnum, maintenanceStatusEnum } from '@/db/schema'

// Define enum values explicitly for Zod validation
const maintenanceSeverityValues = maintenanceSeverityEnum.enumValues as [string, ...string[]]
const maintenanceStatusValues = maintenanceStatusEnum.enumValues as [string, ...string[]]

export const assetMaintenanceSchema = z.object({
  assetId: z.string().min(1, 'Aset yang rusak wajib dipilih'),
  
  severity: z.enum(maintenanceSeverityValues, {
    message: 'Pilih tingkat kerusakan (Ringan/Sedang/Berat)'
  }),
  
  status: z.enum(maintenanceStatusValues).default('REPORTED'),
  
  description: z.string().min(5, 'Deskripsi kerusakan minimal 5 karakter').trim(),
  
  repairCost: z.coerce.number().min(0, 'Biaya tidak boleh negatif').optional(),
  
  // Waktu mulai rusak (Bisa diisi waktu saat ini secara otomatis oleh frontend, atau dipilih manual)
  downtimeStart: z.date({
    message: 'Waktu kejadian wajib diisi',
  }),
})

export type AssetMaintenanceFormValues = z.infer<typeof assetMaintenanceSchema>
