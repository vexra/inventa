import { z } from 'zod'

export const facultySchema = z.object({
  name: z.string().min(3, 'Nama fakultas minimal 3 karakter'),
  description: z.string().optional(),
})

export type FacultyFormValues = z.infer<typeof facultySchema>
