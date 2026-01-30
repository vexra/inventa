import { z } from 'zod'

export const roomSchema = z.object({
  name: z.string().min(1, 'Nama ruangan wajib diisi'),
  buildingId: z.string().min(1, 'Gedung wajib dipilih'),
  unitId: z.string().nullable().optional(),
  type: z.enum(['LABORATORY', 'ADMIN_OFFICE', 'LECTURE_HALL', 'WAREHOUSE_UNIT']),
  description: z.string().optional(),
})

export type RoomFormValues = z.infer<typeof roomSchema>
