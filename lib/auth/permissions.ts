import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getAuthUser } from '@/lib/middleware/auth'

export interface AuthorizedUser {
  userId: string
  email: string
  roleId: string
  roleName: string
  permissions: string[]
}

export function hasPermission(user: AuthorizedUser, permission: string): boolean {
  return user.permissions.includes('*') || user.permissions.includes(permission)
}

export async function getAuthorizedUser(
  request: NextRequest,
  permission?: string
): Promise<{ user: AuthorizedUser | null; response?: NextResponse }> {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return {
      user: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.userId },
    include: { role: true },
  })

  if (!user || !user.isActive) {
    return {
      user: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const authorizedUser: AuthorizedUser = {
    userId: user.id,
    email: user.email,
    roleId: user.roleId,
    roleName: user.role.name,
    permissions: user.role.permissions,
  }

  if (permission && !hasPermission(authorizedUser, permission)) {
    return {
      user: null,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return { user: authorizedUser }
}

export async function assertTaskAccess(taskId: string, user: AuthorizedUser) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignedRole: true,
      assignedUser: true,
    },
  })

  if (!task) {
    return { ok: false as const, status: 404, error: 'Task not found' }
  }

  if (hasPermission(user, '*')) {
    return { ok: true as const, task }
  }

  const assignedToUser = task.assignedUserId === user.userId
  const assignedToRole = task.assignedRoleId === user.roleId
  const canActOnTasks =
    hasPermission(user, 'tasks:approve') ||
    hasPermission(user, 'tasks:reject') ||
    hasPermission(user, 'tasks:request_info')

  if (!canActOnTasks || (!assignedToUser && !assignedToRole)) {
    return { ok: false as const, status: 403, error: 'Forbidden' }
  }

  return { ok: true as const, task }
}
