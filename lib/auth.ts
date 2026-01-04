import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin } from 'better-auth/plugins'

import * as schema from '@/db/schema'
import { db } from '@/lib/db'

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
})
