import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../lib/auth/password'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create roles
  const roles = [
    {
      name: 'ADMIN',
      permissions: ['*'], // All permissions
    },
    {
      name: 'VIAJES_ANALISTA',
      permissions: [
        'cases:read',
        'cases:create',
        'cases:update',
        'tasks:read',
        'tasks:approve',
        'tasks:reject',
        'tasks:request_info',
        'profiles:read',
        'profiles:create',
        'profiles:update',
        'documents:read',
        'documents:upload',
      ],
    },
    {
      name: 'JEFE',
      permissions: [
        'cases:read',
        'cases:update',
        'tasks:read',
        'tasks:approve',
        'tasks:reject',
        'tasks:request_info',
        'profiles:read',
        'documents:read',
      ],
    },
    {
      name: 'FINANZAS',
      permissions: [
        'cases:read',
        'tasks:read',
        'tasks:approve',
        'tasks:reject',
        'tasks:request_info',
        'profiles:read',
        'documents:read',
      ],
    },
    {
      name: 'RRHH',
      permissions: [
        'cases:read',
        'tasks:read',
        'tasks:approve',
        'tasks:reject',
        'tasks:request_info',
        'profiles:read',
        'documents:read',
      ],
    },
  ]

  for (const roleData of roles) {
    await prisma.role.upsert({
      where: { name: roleData.name },
      update: { permissions: roleData.permissions },
      create: roleData,
    })
    console.log(`✓ Role ${roleData.name} created/updated`)
  }

  // Create admin user
  const adminEmail = process.env.ADMIN_SEED_EMAIL || 'admin@indotel.gob.do'
  const adminPassword = process.env.ADMIN_SEED_PASSWORD || 'ChangeThisPassword123!'

  if (!adminPassword || adminPassword.length < 8) {
    throw new Error('ADMIN_SEED_PASSWORD must be at least 8 characters long')
  }

  const adminRole = await prisma.role.findUnique({
    where: { name: 'ADMIN' },
  })

  if (!adminRole) {
    throw new Error('ADMIN role not found')
  }

  const passwordHash = await hashPassword(adminPassword)

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      name: 'Administrator',
      roleId: adminRole.id,
      isActive: true,
    },
    create: {
      email: adminEmail,
      passwordHash,
      name: 'Administrator',
      roleId: adminRole.id,
      isActive: true,
    },
  })

  console.log(`✓ Admin user created/updated: ${adminEmail}`)
  console.log('✓ Seeding completed!')
}

main()
  .catch((e) => {
    console.error('Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
