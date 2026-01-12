import { z } from 'zod'

export const roomSchema = z.object({
  name: z.string().min(2, 'Nama ruangan minimal 2 karakter'),
  unitId: z.string().min(1, 'Unit wajib dipilih'),
  type: z.enum(['LABORATORY', 'ADMIN_OFFICE', 'LECTURE_HALL', 'WAREHOUSE_UNIT'], {
    error: 'Jenis ruangan wajib dipilih',
  }),
  description: z.string().optional(),
})

export type RoomFormValues = z.infer<typeof roomSchema>
