import { z } from 'zod'

export const buildingSchema = z.object({
  facultyId: z.string().min(1, 'Fakultas harus dipilih'),
  name: z.string().min(3, 'Nama gedung minimal 3 karakter'),
  code: z.string().optional(),
  description: z.string().optional(),
})

export type BuildingFormValues = z.infer<typeof buildingSchema>
