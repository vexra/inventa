import { adminClient } from 'better-auth/client/plugins'
import { inferAdditionalFields } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

import {
  ac,
  faculty_admin,
  super_admin,
  unit_admin,
  unit_staff,
  warehouse_staff,
} from '@/lib/permissions'

import type { auth } from './auth'

export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields<typeof auth>(),
    adminClient({
      ac,
      roles: {
        super_admin,
        faculty_admin,
        unit_admin,
        unit_staff,
        warehouse_staff,
      },
    }),
  ],
})
