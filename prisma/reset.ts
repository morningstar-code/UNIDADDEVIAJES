import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Limpiando base de datos...')

  // Delete in order to respect foreign key constraints
  console.log('Eliminando AuditLogs...')
  await prisma.auditLog.deleteMany({})
  
  console.log('Eliminando Documents...')
  await prisma.document.deleteMany({})
  
  console.log('Eliminando Tasks...')
  await prisma.task.deleteMany({})
  
  console.log('Eliminando ProcessedMessages...')
  await prisma.processedMessage.deleteMany({})
  
  console.log('Eliminando Cases...')
  await prisma.case.deleteMany({})
  
  console.log('Eliminando Profiles...')
  await prisma.profile.deleteMany({})
  
  console.log('Eliminando Users...')
  await prisma.user.deleteMany({})
  
  console.log('Eliminando Roles...')
  await prisma.role.deleteMany({})

  console.log('✅ Base de datos limpiada exitosamente!')
  console.log('💡 Ejecuta "npm run db:seed" para restaurar los roles y usuario admin iniciales.')
}

main()
  .catch((e) => {
    console.error('❌ Error limpiando base de datos:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
