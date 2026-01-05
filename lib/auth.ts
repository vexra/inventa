import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin } from 'better-auth/plugins'

import * as schema from '@/db/schema'
import { db } from '@/lib/db'
// Import role yang sudah kita buat
import { ac, administrator, executive, unit_staff, warehouse_staff } from '@/lib/permissions'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: schema,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
  },
  plugins: [
    admin({
      // 1. Masukkan Instance AC
      ac,
      // 2. Mapping Role (String di DB -> Object Role AC)
      roles: {
        administrator,
        warehouse_staff,
        unit_staff,
        executive,
      },
      // 3. Konfigurasi Role Admin Utama
      adminRoles: ['administrator'],
      defaultRole: 'unit_staff',
    }),
  ],
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'unit_staff',
        input: false,
      },
      unitId: { type: 'string', required: false, input: false },
      warehouseId: { type: 'string', required: false, input: false },
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
})
