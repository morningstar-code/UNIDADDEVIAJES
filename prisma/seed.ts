import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../lib/auth/password'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const commonReadPermissions = [
    'dashboard:read',
    'cases:read',
    'profiles:read',
    'documents:read',
    'documents:attach',
    'matrix:read',
    'notifications:read',
  ]

  // Create roles
  const roles = [
    {
      name: 'ADMIN',
      permissions: ['*'], // All permissions
    },
    {
      name: 'RI_DIRECTORA',
      permissions: [
        ...commonReadPermissions,
        'matrix:create',
        'matrix:update',
        'matrix:pauta',
        'matrix:convert',
        'cases:cancel',
        'designations:request_new',
        'cases:create',
        'cases:update',
        'tasks:read',
        'tasks:approve',
        'tasks:reject',
        'tasks:request_info',
      ],
    },
    {
      name: 'VIAJES_ANALISTA',
      permissions: [
        ...commonReadPermissions,
        'cases:create',
        'cases:update',
        'cases:close',
        'matrix:convert',
        'designations:create',
        'designations:edit',
        'designations:generate',
        'designations:send',
        'tasks:read',
        'tasks:approve',
        'tasks:reject',
        'tasks:request_info',
        'profiles:create',
        'profiles:update',
        'documents:upload',
        'documents:validate',
        'documents:reject',
        'documents:attach',
        'sharepoint:sync',
        'documents:generate',
        'liquidation:generate',
        'liquidation:review',
        'liquidation:approve',
        'liquidation:return',
        'liquidation:waive',
        'expedientes:read',
        'expedientes:update',
        'expedientes:send_despacho',
      ],
    },
    {
      name: 'DESPACHO',
      permissions: [
        ...commonReadPermissions,
        'tasks:read',
        'tasks:approve',
        'tasks:reject',
        'tasks:request_info',
        'expedientes:read',
        'expedientes:review',
        'expedientes:send_consejo',
      ],
    },
    {
      name: 'CONSEJO_DIRECTIVO',
      permissions: [
        ...commonReadPermissions,
        'tasks:read',
        'tasks:approve',
        'tasks:reject',
        'tasks:request_info',
        'expedientes:read',
        'expedientes:sign',
        'documents:upload',
      ],
    },
    {
      name: 'JEFE',
      permissions: [
        ...commonReadPermissions,
        'cases:update',
        'tasks:read',
        'tasks:approve',
        'tasks:reject',
        'tasks:request_info',
        'expedientes:read',
      ],
    },
    {
      name: 'FINANZAS',
      permissions: [
        ...commonReadPermissions,
        'tasks:read',
        'tasks:approve',
        'tasks:reject',
        'tasks:request_info',
        'expedientes:read',
      ],
    },
    {
      name: 'RRHH',
      permissions: [
        ...commonReadPermissions,
        'tasks:read',
        'tasks:approve',
        'tasks:reject',
        'tasks:request_info',
        'expedientes:read',
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
