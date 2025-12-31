import * as crypto from 'crypto'
import 'dotenv/config'
import { eq } from 'drizzle-orm'

import { roles, user } from '@/db/schema'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

async function main() {
  const password = 'password123'

  const seedData = [
    {
      roleName: 'Administrator',
      email: 'admin@inventa.fmipa.unila.ac.id',
      userName: 'Administrator User',
    },
    {
      roleName: 'Warehouse Admin',
      email: 'warehouse@inventa.fmipa.unila.ac.id',
      userName: 'Warehouse Admin User',
    },
    {
      roleName: 'Unit Representative',
      email: 'unit@inventa.fmipa.unila.ac.id',
      userName: 'Unit Rep User',
    },
    {
      roleName: 'Executive',
      email: 'executive@inventa.fmipa.unila.ac.id',
      userName: 'Executive User',
    },
  ]

  console.log('🚀 Starting seeding process...')

  for (const data of seedData) {
    let roleId: string

    const existingRole = await db.select().from(roles).where(eq(roles.name, data.roleName)).limit(1)

    if (existingRole.length > 0) {
      roleId = existingRole[0].id
      console.log(`ℹ️  Role found: ${data.roleName}`)
    } else {
      const newRole = await db
        .insert(roles)
        .values({
          id: crypto.randomUUID(),
          name: data.roleName,
        })
        .returning({ id: roles.id })

      roleId = newRole[0].id
      console.log(`✅ Role created: ${data.roleName}`)
    }

    const existingUsers = await db.select().from(user).where(eq(user.email, data.email)).limit(1)
    const existingUser = existingUsers[0]

    if (existingUser) {
      if (existingUser.roleId !== roleId) {
        await db.update(user).set({ roleId: roleId }).where(eq(user.id, existingUser.id))
        console.log(`🔄 Updated role for existing user: ${data.email}`)
      } else {
        console.log(`⏭️  User already exists and valid: ${data.email}`)
      }
      continue
    }

    const response = await auth.api.signUpEmail({
      body: {
        email: data.email,
        password: password,
        name: data.userName,
      },
      asResponse: false,
    })

    if (response.user) {
      await db
        .update(user)
        .set({
          roleId: roleId,
          emailVerified: true,
        })
        .where(eq(user.id, response.user.id))

      console.log(`🌱 Created new user: ${data.email} (${data.roleName})`)
    }
  }

  console.log('🏁 Seeding completed successfully')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seeding failed:')
    console.error(err)
    process.exit(1)
  })
