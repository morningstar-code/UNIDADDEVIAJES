import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUser } from '@/lib/auth/permissions'
import { TravelMatrixStatus } from '@prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await getAuthorizedUser(request, 'matrix:pauta')
  if (!user) return response!

  try {
    const { observations } = await request.json().catch(() => ({ observations: undefined }))
    const entry = await prisma.travelMatrixEntry.update({
      where: { id: params.id },
      data: {
        status: TravelMatrixStatus.PAUTA_RI_DADA,
        pautaGivenByUserId: user.userId,
        pautaGivenAt: new Date(),
        observations: observations || undefined,
      },
    })

    await prisma.auditLog.create({
      data: {
        actorUserId: user.userId,
        action: 'RI_PAUTA_GIVEN',
        details: { matrixEntryId: entry.id, observations },
      },
    })

    await prisma.notification.create({
      data: {
        type: 'RI_PAUTA_GIVEN',
        title: 'Pauta RI dada',
        message: `Relaciones Internacionales dio pauta para iniciar: ${entry.eventName}`,
      },
    })

    return NextResponse.json(entry)
  } catch (error) {
    console.error('Pauta RI error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
