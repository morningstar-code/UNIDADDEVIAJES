import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware/auth'
import { prisma } from '@/lib/db/prisma'
import { CaseSource, CaseStatus, WorkflowStep, TaskStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await request.json()
    const { profileId, ...caseData } = data

    if (!profileId) {
      return NextResponse.json({ error: 'profileId is required' }, { status: 400 })
    }

    // Verify profile exists
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
    })

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const caseRecord = await prisma.case.create({
      data: {
        profileId,
        createdByUserId: authUser.userId,
        source: CaseSource.MANUAL,
        status: CaseStatus.RECEIVED,
        destinoPais: caseData.destinoPais,
        destinoCiudad: caseData.destinoCiudad,
        fechaSalida: caseData.fechaSalida ? new Date(caseData.fechaSalida) : undefined,
        fechaRetorno: caseData.fechaRetorno ? new Date(caseData.fechaRetorno) : undefined,
        motivo: caseData.motivo,
        evento: caseData.evento,
        institucionOrganizadora: caseData.institucionOrganizadora,
        montoEstimado: caseData.montoEstimado ? parseFloat(caseData.montoEstimado) : undefined,
        moneda: caseData.moneda || 'USD',
      },
    })

    // Create first task
    const viajesAnalistaRole = await prisma.role.findUnique({
      where: { name: 'VIAJES_ANALISTA' },
    })

    if (viajesAnalistaRole) {
      await prisma.task.create({
        data: {
          caseId: caseRecord.id,
          step: WorkflowStep.DOCS_VALIDATION,
          assignedRoleId: viajesAnalistaRole.id,
          status: TaskStatus.PENDING,
        },
      })
    }

    await prisma.auditLog.create({
      data: {
        actorUserId: authUser.userId,
        caseId: caseRecord.id,
        profileId: profile.id,
        action: 'CASE_CREATED',
        details: { source: 'MANUAL' },
      },
    })

    return NextResponse.json(caseRecord)
  } catch (error) {
    console.error('Case creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
