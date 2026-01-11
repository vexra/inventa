import { z } from 'zod'

export const unitSchema = z.object({
  name: z.string().min(1, 'Nama unit wajib diisi').trim(),
  facultyId: z.string().min(1, 'Fakultas wajib dipilih'),
  description: z.string().trim().optional(),
})

export type UnitFormValues = z.infer<typeof unitSchema>
