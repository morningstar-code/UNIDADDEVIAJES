import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUser } from '@/lib/auth/permissions'
import { CaseStatus, DocumentRequirementStatus } from '@prisma/client'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; requirementId: string } }
) {
  const { user, response } = await getAuthorizedUser(request, 'documents:validate')
  if (!user) return response!

  try {
    const { action, observations } = await request.json()
    if (!['VALIDATE', 'REJECT', 'WAIVE'].includes(action)) {
      return NextResponse.json({ error: 'Accion invalida' }, { status: 400 })
    }

    const status =
      action === 'VALIDATE'
        ? DocumentRequirementStatus.VALIDATED
        : action === 'REJECT'
          ? DocumentRequirementStatus.REJECTED
          : DocumentRequirementStatus.WAIVED

    const requirement = await prisma.documentRequirement.update({
      where: { id: params.requirementId },
      data: {
        status,
        observations,
        validatedByUserId: user.userId,
        validatedAt: new Date(),
      },
    })

    if (requirement.documentId) {
      await prisma.document.update({
        where: { id: requirement.documentId },
        data: { status, observations },
      })
    }

    const pendingRequired = await prisma.documentRequirement.count({
      where: {
        caseId: params.id,
        required: true,
        status: { notIn: [DocumentRequirementStatus.VALIDATED, DocumentRequirementStatus.WAIVED] },
      },
    })

    if (pendingRequired === 0) {
      await prisma.case.update({
        where: { id: params.id },
        data: {
          status: CaseStatus.DOCUMENTOS_COMPLETOS,
          expedienteCompleto: true,
          expedienteCompletedAt: new Date(),
        },
      })
    }

    await prisma.auditLog.create({
      data: {
        actorUserId: user.userId,
        caseId: params.id,
        action: action === 'VALIDATE' ? 'DOCUMENT_VALIDATED' : action === 'REJECT' ? 'DOCUMENT_REJECTED' : 'DOCUMENT_WAIVED',
        details: { requirementId: requirement.id, observations },
      },
    })

    if (action === 'REJECT') {
      await prisma.notification.create({
        data: {
          caseId: params.id,
          type: 'DOCUMENT_REJECTED',
          title: 'Documento rechazado',
          message: observations
            ? `Un documento fue rechazado: ${observations}`
            : 'Un documento fue rechazado y requiere correccion.',
        },
      })
    }

    return NextResponse.json(requirement)
  } catch (error) {
    console.error('Requirement action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
