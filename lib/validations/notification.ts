import * as z from 'zod'

export const notificationSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi'),
  message: z.string().min(1, 'Pesan wajib diisi'),
  type: z.enum(['INFO', 'SUCCESS', 'WARNING', 'ERROR']),
  link: z.string().optional(),
})

export type NotificationFormValues = z.infer<typeof notificationSchema>
