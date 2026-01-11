import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin } from 'better-auth/plugins'

import * as schema from '@/db/schema'
import { db } from '@/lib/db'
import {
  ac,
  faculty_admin,
  super_admin,
  unit_admin,
  unit_staff,
  warehouse_staff,
} from '@/lib/permissions'

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
      ac,
      roles: {
        super_admin,
        faculty_admin,
        unit_admin,
        unit_staff,
        warehouse_staff,
      },
      adminRoles: ['super_admin'],
      defaultRole: 'unit_staff',
      bannedUserMessage:
        'Anda telah diblokir dari aplikasi ini. Silakan hubungi tim dukungan jika Anda merasa ini adalah sebuah kesalahan.',
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
