import { z } from 'zod'

export const unitSchema = z.object({
  name: z.string().min(1, 'Nama unit wajib diisi'),
  description: z.string().optional(),
})

export type UnitFormValues = z.infer<typeof unitSchema>
