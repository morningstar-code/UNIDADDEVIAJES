import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUser } from '@/lib/auth/permissions'
import { buildDesignationBody, buildDesignationSubject } from '@/lib/designations/templates'
import { sendMail } from '@/lib/graph/send'
import { CaseStatus, DesignationStatus, WorkflowStep } from '@prisma/client'

function getAppBaseUrl(request: NextRequest) {
  return process.env.APP_BASE_URL || request.nextUrl.origin
}

async function getOrCreateDesignation(caseId: string, request: NextRequest) {
  const caseRecord = await prisma.case.findUnique({
    where: { id: caseId },
    include: { profile: true },
  })

  if (!caseRecord) {
    return { error: NextResponse.json({ error: 'Case not found' }, { status: 404 }) }
  }

  if (!caseRecord.profile.primaryEmail) {
    return {
      error: NextResponse.json(
        { error: 'El perfil no tiene email para enviar la designacion' },
        { status: 400 }
      ),
    }
  }

  const existing = await prisma.designation.findFirst({
    where: { caseId },
    orderBy: { createdAt: 'desc' },
  })

  if (existing) {
    return { caseRecord, designation: existing }
  }

  const token = randomUUID()
  const tokenExpiresAt = new Date()
  tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 30)
  const acceptanceUrl = `${getAppBaseUrl(request)}/designacion/${token}`

  const designation = await prisma.designation.create({
    data: {
      caseId,
      collaboratorName: caseRecord.profile.fullName || undefined,
      collaboratorEmail: caseRecord.profile.primaryEmail,
      collaboratorPosition: caseRecord.profile.cargo || undefined,
      collaboratorArea: caseRecord.profile.departamento || undefined,
      subject: buildDesignationSubject(caseRecord),
      body: buildDesignationBody(caseRecord, acceptanceUrl),
      token,
      tokenExpiresAt,
      status: DesignationStatus.DRAFT,
    },
  })

  await prisma.case.update({
    where: { id: caseId },
    data: {
      status: CaseStatus.DESIGNACION_GENERADA,
      currentWorkflowStep: WorkflowStep.DESIGNATION,
    },
  })

  return { caseRecord, designation }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await getAuthorizedUser(request, 'designations:create')
  if (!user) return response!

  const result = await getOrCreateDesignation(params.id, request)
  if (result.error) return result.error
  return NextResponse.json(result.designation)
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await getAuthorizedUser(request, 'designations:send')
  if (!user) return response!

  try {
    const result = await getOrCreateDesignation(params.id, request)
    if (result.error) return result.error
    const { designation } = result
    const data = await request.json()
    const subject = data.subject || designation.subject
    const body = data.body || designation.body

    await sendMail({
      to: designation.collaboratorEmail,
      subject,
      htmlBody: body,
    })

    const updated = await prisma.designation.update({
      where: { id: designation.id },
      data: {
        subject,
        body,
        status: DesignationStatus.SENT,
        sentAt: new Date(),
        sentByUserId: user.userId,
      },
    })

    await prisma.case.update({
      where: { id: params.id },
      data: {
        status: CaseStatus.PENDIENTE_ACEPTACION_COLABORADOR,
        currentWorkflowStep: WorkflowStep.COLLABORATOR_ACCEPTANCE,
      },
    })

    await prisma.auditLog.create({
      data: {
        actorUserId: user.userId,
        caseId: params.id,
        action: 'DESIGNATION_EMAIL_SENT',
        details: {
          designationId: designation.id,
          recipient: designation.collaboratorEmail,
        },
      },
    })

    await prisma.notification.create({
      data: {
        caseId: params.id,
        type: 'DESIGNATION_SENT',
        title: 'Designacion enviada',
        message: `Se envio la designacion a ${designation.collaboratorEmail}`,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Designation send error:', error)
    return NextResponse.json({ error: 'No se pudo enviar la designacion' }, { status: 500 })
  }
}
