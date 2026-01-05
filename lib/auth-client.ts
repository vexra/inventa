import { adminClient } from 'better-auth/client/plugins'
import { inferAdditionalFields } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

import { ac, administrator, executive, unit_staff, warehouse_staff } from '@/lib/permissions'

import type { auth } from './auth'

export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields<typeof auth>(),
    adminClient({
      ac,
      roles: {
        administrator,
        warehouse_staff,
        unit_staff,
        executive,
      },
    }),
  ],
})
