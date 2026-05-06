import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUser } from '@/lib/auth/permissions'
import { hashPassword } from '@/lib/auth/password'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await getAuthorizedUser(request, 'users:manage')
  if (!user) return response!

  const data = await request.json()
  const updated = await prisma.user.update({
    where: { id: params.id },
    data: {
      name: data.name,
      roleId: data.roleId,
      isActive: data.isActive,
      ...(data.password ? { passwordHash: await hashPassword(data.password) } : {}),
    },
  })

  await prisma.auditLog.create({
    data: {
      actorUserId: user.userId,
      action: 'USER_UPDATED',
      details: { userId: updated.id, email: updated.email },
    },
  })

  return NextResponse.json(updated)
}
