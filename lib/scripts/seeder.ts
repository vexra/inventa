import { eq } from 'drizzle-orm'

import { buildings, faculties, rooms, units, user, userRoleEnum, warehouses } from '@/db/schema'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// Tipe data untuk input seeder user
type UserSeedData = {
  role: (typeof userRoleEnum.enumValues)[number]
  email: string
  userName: string
  facultyId?: string // Opsional: Jika dia orang Fakultas
  unitId?: string // Opsional: Jika dia orang Jurusan
  warehouseId?: string // Opsional: Jika dia petugas Gudang
}

async function seedOrganization() {
  console.log('🏢 Seeding Organization Structure...')

  // 1. Buat Fakultas (FMIPA)
  await db
    .insert(faculties)
    .values({
      id: 'fac-fmipa',
      name: 'Fakultas Matematika dan Ilmu Pengetahuan Alam',
      description: 'Fakultas MIPA Universitas Lampung',
    })
    .onConflictDoNothing()

  // 2. Buat Unit / Jurusan (Biologi & Kimia)
  await db
    .insert(units)
    .values([
      {
        id: 'unit-bio',
        facultyId: 'fac-fmipa',
        name: 'Jurusan Biologi',
        description: 'Jurusan Biologi FMIPA',
      },
      {
        id: 'unit-chem',
        facultyId: 'fac-fmipa',
        name: 'Jurusan Kimia',
        description: 'Jurusan Kimia FMIPA',
      },
    ])
    .onConflictDoNothing()

  await db
    .insert(buildings)
    .values([
      {
        id: 'bld-mipa-terpadu',
        facultyId: 'fac-fmipa',
        name: 'Gedung MIPA Terpadu',
        code: 'GMT',
      },
      {
        id: 'bld-bio',
        facultyId: 'fac-fmipa',
        name: 'Gedung Jurusan Biologi',
        code: 'GJB',
      },
    ])
    .onConflictDoNothing()

  await db
    .insert(warehouses)
    .values([
      {
        id: 'wh-chem',
        facultyId: 'fac-fmipa',
        name: 'Gudang Bahan Kimia',
        type: 'CHEMICAL',
        description: 'Penyimpanan B3 dan Zat Kimia',
      },
      {
        id: 'wh-atk',
        facultyId: 'fac-fmipa',
        name: 'Gudang ATK Umum',
        type: 'GENERAL_ATK',
        description: 'Penyimpanan Kertas dan Alat Tulis',
      },
    ])
    .onConflictDoNothing()

  await db
    .insert(rooms)
    .values([
      {
        id: 'room-bio-1',
        buildingId: 'bld-bio',
        unitId: 'unit-bio',
        name: 'Lab Mikrobiologi Dasar',
        type: 'LABORATORY',
        qrToken: 'QR-BIO-001',
      },
      {
        id: 'room-tu-bio',
        buildingId: 'bld-bio',
        unitId: 'unit-bio',
        name: 'Ruang TU Biologi',
        type: 'ADMIN_OFFICE',
        qrToken: 'QR-BIO-TU',
      },
      {
        id: 'room-aula-mipa',
        buildingId: 'bld-mipa-terpadu',
        unitId: null,
        name: 'Aula Utama FMIPA',
        type: 'LECTURE_HALL',
        qrToken: 'QR-AULA-01',
      },
    ])
    .onConflictDoNothing()

  console.log('✅ Organization structure ready.')
}

async function main() {
  const password = process.env.DEFAULT_PASSWORD || 'InventaUnila2026!$'

  // Pastikan struktur organisasi ada dulu sebelum buat user
  await seedOrganization()

  const seedUsers: UserSeedData[] = [
    {
      role: 'super_admin',
      email: 'admin@inventa.fmipa.unila.ac.id',
      userName: 'Super Administrator',
    },
    {
      role: 'faculty_admin', // Dekanat / WD2
      email: 'wd2@inventa.fmipa.unila.ac.id',
      userName: 'Wakil Dekan 2',
      facultyId: 'fac-fmipa',
    },
    {
      role: 'unit_admin', // Kajur Biologi
      email: 'kajur.bio@inventa.fmipa.unila.ac.id',
      userName: 'Ketua Jurusan Biologi',
      unitId: 'unit-bio',
    },
    {
      role: 'warehouse_staff', // Petugas Gudang Kimia
      email: 'staff.gudang@inventa.fmipa.unila.ac.id',
      userName: 'Petugas Gudang Kimia',
      warehouseId: 'wh-chem',
    },
    {
      role: 'unit_staff', // Laboran / Dosen Biologi
      email: 'laboran.bio@inventa.fmipa.unila.ac.id',
      userName: 'Staff Lab Biologi',
      unitId: 'unit-bio',
    },
  ]

  console.log('🚀 Starting User seeding process...')

  for (const data of seedUsers) {
    const existingUsers = await db.select().from(user).where(eq(user.email, data.email)).limit(1)
    const existingUser = existingUsers[0]

    const updatePayload = {
      role: data.role,
      unitId: data.unitId || null,
      warehouseId: data.warehouseId || null,
      facultyId: data.facultyId || null,
    }

    if (existingUser) {
      if (
        existingUser.role !== data.role ||
        existingUser.unitId !== data.unitId ||
        existingUser.warehouseId !== data.warehouseId ||
        existingUser.facultyId !== data.facultyId
      ) {
        await db.update(user).set(updatePayload).where(eq(user.id, existingUser.id))
        console.log(`🔄 Updated info for: ${data.email}`)
      } else {
        console.log(`⏭️  User already up to date: ${data.email}`)
      }
      continue
    }

    try {
      // Create user via Better-Auth
      const response = await auth.api.signUpEmail({
        body: {
          email: data.email,
          password: password,
          name: data.userName,
        },
        asResponse: false,
      })

      if (response.user) {
        // Update Role & Unit/Warehouse/Faculty segera setelah user dibuat
        await db
          .update(user)
          .set({
            ...updatePayload,
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