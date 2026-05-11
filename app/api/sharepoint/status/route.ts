import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUser } from '@/lib/auth/permissions'
import { resolveSharePointConfig, SharePointPermissionError } from '@/lib/graph/sharepoint'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { user, response } = await getAuthorizedUser(request, 'sharepoint:sync')
  if (!user) return response!

  const lastConfig = await prisma.sharePointSyncConfig.findFirst({
    orderBy: { updatedAt: 'desc' },
  })

  try {
    const resolved = await resolveSharePointConfig()
    return NextResponse.json({
      configured: true,
      reachable: true,
      storageMode: process.env.SHAREPOINT_STORAGE_MODE || 'metadata-only',
      resolved,
      lastSync: lastConfig,
    })
  } catch (error) {
    return NextResponse.json(
      {
        configured: false,
        reachable: false,
        storageMode: process.env.SHAREPOINT_STORAGE_MODE || 'metadata-only',
        error:
          error instanceof SharePointPermissionError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'No se pudo resolver SharePoint',
        lastSync: lastConfig,
      },
      { status: error instanceof SharePointPermissionError ? 403 : 500 }
    )
  }
}
