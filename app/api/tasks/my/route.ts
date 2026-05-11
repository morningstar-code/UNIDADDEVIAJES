import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizedUser } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { TaskStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  const { user: authUser, response } = await getAuthorizedUser(request, 'tasks:read')
  if (!authUser) return response!

  const user = await prisma.user.findUnique({
    where: { id: authUser.userId },
    include: { role: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Get tasks assigned to user or their role
  const tasks = await prisma.task.findMany({
    where: {
      status: TaskStatus.PENDING,
      OR: [
        { assignedUserId: user.id },
        { assignedRoleId: user.roleId },
      ],
    },
    include: {
      case: {
        include: {
          profile: {
            select: {
              id: true,
              primaryEmail: true,
              fullName: true,
            },
          },
        },
      },
      assignedRole: {
        select: { id: true, name: true },
      },
      assignedUser: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ tasks })
}
