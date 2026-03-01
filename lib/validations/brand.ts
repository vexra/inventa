import { z } from 'zod'

export const brandSchema = z.object({
  name: z.string().min(2, 'Nama merek minimal 2 karakter').trim(),
  country: z.string().trim().optional(),
})

export type BrandFormValues = z.infer<typeof brandSchema>