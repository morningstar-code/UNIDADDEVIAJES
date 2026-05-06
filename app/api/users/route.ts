import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUser } from '@/lib/auth/permissions'
import { hashPassword } from '@/lib/auth/password'

export async function GET(request: NextRequest) {
  const { user, response } = await getAuthorizedUser(request, 'users:manage')
  if (!user) return response!

  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.role.findMany({ orderBy: { name: 'asc' } }),
  ])
  return NextResponse.json({ users, roles })
}

export async function POST(request: NextRequest) {
  const { user, response } = await getAuthorizedUser(request, 'users:manage')
  if (!user) return response!

  const data = await request.json()
  if (!data.email || !data.password || !data.roleId) {
    return NextResponse.json({ error: 'Email, password y rol son requeridos' }, { status: 400 })
  }

  const created = await prisma.user.create({
    data: {
      email: data.email.toLowerCase().trim(),
      passwordHash: await hashPassword(data.password),
      name: data.name || undefined,
      roleId: data.roleId,
      isActive: data.isActive ?? true,
    },
  })

  await prisma.auditLog.create({
    data: {
      actorUserId: user.userId,
      action: 'USER_CREATED',
      details: { userId: created.id, email: created.email },
    },
  })

  return NextResponse.json(created)
}
