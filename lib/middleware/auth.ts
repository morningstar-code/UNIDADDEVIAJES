import { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import { prisma } from '@/lib/db/prisma'

export interface AuthUser {
  userId: string
  email: string
  roleId: string
}

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  const payload = verifyToken(token)

  if (!payload) {
    return null
  }

  // Verify user still exists and is active
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, roleId: true, isActive: true },
  })

  if (!user || !user.isActive) {
    return null
  }

  return {
    userId: user.id,
    email: user.email,
    roleId: user.roleId,
  }
}
