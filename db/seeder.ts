import 'dotenv/config'
import { eq } from 'drizzle-orm'

import { user, userRoleEnum } from '@/db/schema'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

type UserRole = (typeof userRoleEnum.enumValues)[number]

async function main() {
  const password = 'password123'

  const seedData: { role: UserRole; email: string; userName: string }[] = [
    {
      role: 'Administrator',
      email: 'admin@inventa.fmipa.unila.ac.id',
      userName: 'Administrator User',
    },
    {
      role: 'Warehouse Admin',
      email: 'warehouse@inventa.fmipa.unila.ac.id',
      userName: 'Warehouse Admin User',
    },
    {
      role: 'Unit Staff',
      email: 'unit@inventa.fmipa.unila.ac.id',
      userName: 'Unit Staff User',
    },
    {
      role: 'Executive',
      email: 'executive@inventa.fmipa.unila.ac.id',
      userName: 'Executive User',
    },
  ]

  console.log('🚀 Starting seeding process...')

  for (const data of seedData) {
    const existingUsers = await db.select().from(user).where(eq(user.email, data.email)).limit(1)

    const existingUser = existingUsers[0]

    if (existingUser) {
      if (existingUser.role !== data.role) {
        await db.update(user).set({ role: data.role }).where(eq(user.id, existingUser.id))
        console.log(`🔄 Updated role for existing user: ${data.email} -> ${data.role}`)
      } else {
        console.log(`⏭️  User already exists and valid: ${data.email}`)
      }
      continue
    }

    try {
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
            role: data.role,
            emailVerified: true,
          })
          .where(eq(user.id, response.user.id))

        console.log(`🌱 Created new user: ${data.email} as [${data.role}]`)
      }
    } catch (error) {
      console.error(`❌ Failed to create user ${data.email}:`, error)
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
