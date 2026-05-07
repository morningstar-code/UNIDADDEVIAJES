import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { DesignationStatus, GeneratedDocumentType } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const designation = await prisma.designation.findUnique({
    where: { token: params.token },
    include: { case: { include: { profile: true } } },
  })

  if (!designation || designation.tokenExpiresAt < new Date()) {
    return NextResponse.json({ error: 'Designacion no encontrada o expirada' }, { status: 404 })
  }
  if (designation.status !== DesignationStatus.SENT && designation.status !== DesignationStatus.ACCEPTED) {
    return NextResponse.json({ error: 'La designacion aun no ha sido enviada' }, { status: 403 })
  }

  const generated =
    (await prisma.generatedDocument.findUnique({
      where: {
        caseId_type: {
          caseId: designation.caseId,
          type: GeneratedDocumentType.FORMULARIO_LIQUIDACION_INFORMATIVO,
        },
      },
      include: { document: true },
    })) ||
    (await prisma.generatedDocument.findUnique({
      where: {
        caseId_type: {
          caseId: designation.caseId,
          type: GeneratedDocumentType.FORMULARIO_LIQUIDACION,
        },
      },
      include: { document: true },
    }))

  if (!generated?.document) {
    return NextResponse.json({ error: 'Formulario de liquidacion no generado' }, { status: 404 })
  }

  await prisma.auditLog.create({
    data: {
      caseId: designation.caseId,
      profileId: designation.case.profileId,
      action: 'FORMULARIO_LIQUIDACION_DESCARGADO',
      details: { documentId: generated.document.id, token: params.token },
    },
  })

  return NextResponse.redirect(generated.document.blobUrl)
}
