import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUser } from '@/lib/auth/permissions'
import { upsertProfileByCedulaOrEmail } from '@/lib/public/upsert-profile'
import { uploadAttachmentToBlob } from '@/lib/blob/upload'
import { ensureDefaultRequirements } from '@/lib/cases/requirements'
import {
  AuthorizationEvidenceChannel,
  CaseSource,
  CaseStatus,
  DocumentType,
  NotificationType,
  TaskStatus,
  TravelAuthorizationType,
  TravelAuthorizationValidationStatus,
  WorkflowStep,
} from '@prisma/client'

export const runtime = 'nodejs'
export const maxDuration = 60

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function boolValue(formData: FormData, key: string) {
  return stringValue(formData, key) === 'true'
}

function dateValue(formData: FormData, key: string) {
  const value = stringValue(formData, key)
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function mapreDeadlineFor(departureDate?: Date) {
  if (!departureDate) return undefined
  const deadline = new Date(departureDate)
  deadline.setDate(deadline.getDate() - 15)
  return deadline
}

function isOutOfMapreDeadline(departureDate?: Date) {
  const deadline = mapreDeadlineFor(departureDate)
  if (!deadline) return false
  return deadline < new Date()
}

function sourceFor(type: TravelAuthorizationType) {
  return type === TravelAuthorizationType.MEMORANDO_PRESIDENCIA
    ? CaseSource.AUTHORIZATION_MEMO
    : CaseSource.DIRECT_INSTRUCTION
}

function documentTypeFor(type: TravelAuthorizationType) {
  return type === TravelAuthorizationType.MEMORANDO_PRESIDENCIA
    ? DocumentType.MEMORANDO_AUTORIZACION_PRESIDENCIA
    : DocumentType.EVIDENCIA_INSTRUCCION_DIRECTA
}

export async function POST(request: NextRequest) {
  const { user, response } = await getAuthorizedUser(request, 'cases:create')
  if (!user) return response!

  try {
    const formData = await request.formData()
    const authorizationType = stringValue(formData, 'authorizationType') as TravelAuthorizationType | undefined
    const evidenceChannel = stringValue(formData, 'evidenceChannel') as AuthorizationEvidenceChannel | undefined
    const authorizedBy = stringValue(formData, 'authorizedBy')
    const justification = stringValue(formData, 'justification')
    const profileIdInput = stringValue(formData, 'profileId')
    const email = stringValue(formData, 'email')
    const fullName = stringValue(formData, 'fullName')
    const cedula = stringValue(formData, 'cedula')
    const cargo = stringValue(formData, 'cargo')
    const departamento = stringValue(formData, 'departamento')
    const destinoPais = stringValue(formData, 'destinoPais')
    const destinoCiudad = stringValue(formData, 'destinoCiudad')
    const evento = stringValue(formData, 'evento')
    const motivo = stringValue(formData, 'motivo')
    const institucionOrganizadora = stringValue(formData, 'institucionOrganizadora')
    const observaciones = stringValue(formData, 'observaciones')
    const fechaSalida = dateValue(formData, 'fechaSalida')
    const fechaRetorno = dateValue(formData, 'fechaRetorno')
    const sourceEmailMessageId = stringValue(formData, 'sourceEmailMessageId')
    const sourceEmailRaw = stringValue(formData, 'sourceEmailRaw')
    const isRecurringTravel = boolValue(formData, 'isRecurringTravel')
    const isUnexpectedTravel =
      boolValue(formData, 'isUnexpectedTravel') ||
      authorizationType === TravelAuthorizationType.VIAJE_IMPREVISTO

    if (!authorizationType || !Object.values(TravelAuthorizationType).includes(authorizationType)) {
      return NextResponse.json({ error: 'Tipo de autorizacion invalido' }, { status: 400 })
    }

    if (evidenceChannel && !Object.values(AuthorizationEvidenceChannel).includes(evidenceChannel)) {
      return NextResponse.json({ error: 'Canal de evidencia invalido' }, { status: 400 })
    }

    if (!authorizedBy || !justification) {
      return NextResponse.json(
        { error: 'Debe indicar quien autorizo/instruyo y una justificacion obligatoria' },
        { status: 400 }
      )
    }

    if (!profileIdInput && !email && !cedula) {
      return NextResponse.json(
        { error: 'Debe seleccionar un perfil o indicar email/cedula del colaborador' },
        { status: 400 }
      )
    }

    if (fechaSalida && fechaRetorno && fechaRetorno < fechaSalida) {
      return NextResponse.json(
        { error: 'La fecha de retorno debe ser posterior a la salida' },
        { status: 400 }
      )
    }

    let profileId = profileIdInput
    if (!profileId) {
      const [firstName, ...rest] = (fullName || '').split(/\s+/)
      const result = await upsertProfileByCedulaOrEmail({
        email,
        cedula,
        firstName: firstName || undefined,
        lastName: rest.join(' ') || undefined,
        cargo,
        departamento,
      })
      profileId = result.profileId
    }

    const profile = await prisma.profile.findUnique({ where: { id: profileId } })
    if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

    const isLateForMapre = isOutOfMapreDeadline(fechaSalida)
    const caseRecord = await prisma.case.create({
      data: {
        profileId,
        createdByUserId: user.userId,
        source: sourceFor(authorizationType),
        status: CaseStatus.PENDIENTE_VALIDACION_AMPARO,
        currentWorkflowStep: WorkflowStep.AUTHORIZATION_VALIDATION,
        destinoPais,
        destinoCiudad,
        fechaSalida,
        fechaRetorno,
        motivo,
        evento,
        institucionOrganizadora,
        observaciones,
        priority: isLateForMapre || isUnexpectedTravel ? 'CRITICO' : undefined,
      },
    })

    await ensureDefaultRequirements(prisma, caseRecord.id)

    let authorizationDocument: { id: string; blobUrl: string; originalFilename: string } | null = null
    const evidenceFile = formData.get('evidenceFile') as File | null
    if (evidenceFile && evidenceFile.size > 0) {
      const buffer = Buffer.from(await evidenceFile.arrayBuffer())
      const upload = await uploadAttachmentToBlob({
        profileId,
        caseId: caseRecord.id,
        originalFilename: evidenceFile.name,
        buffer,
        contentType: evidenceFile.type || 'application/octet-stream',
        docType: documentTypeFor(authorizationType),
      })
      const document = await prisma.document.create({
        data: {
          profileId,
          caseId: caseRecord.id,
          docType: documentTypeFor(authorizationType),
          originalFilename: evidenceFile.name,
          mimeType: evidenceFile.type || 'application/octet-stream',
          sizeBytes: buffer.length,
          blobUrl: upload.blobUrl,
          blobPathname: upload.blobPathname,
          checksumSha256: upload.checksumSha256,
          uploadedByUserId: user.userId,
          uploadedByName: user.email,
        },
      })
      authorizationDocument = {
        id: document.id,
        blobUrl: document.blobUrl,
        originalFilename: document.originalFilename,
      }
    }

    const mapreDeadline = mapreDeadlineFor(fechaSalida)
    await prisma.travelAuthorization.create({
      data: {
        caseId: caseRecord.id,
        type: authorizationType,
        evidenceChannel,
        authorizationDocumentId: authorizationDocument?.id,
        authorizationDocumentUrl: authorizationDocument?.blobUrl,
        authorizationDocumentName: authorizationDocument?.originalFilename,
        sourceEmailMessageId,
        sourceEmailRaw,
        authorizedBy,
        registeredByUserId: user.userId,
        authorizedAt: dateValue(formData, 'authorizedAt') || new Date(),
        justification,
        requiresAmparoValidation: true,
        validationStatus: TravelAuthorizationValidationStatus.PENDIENTE_VALIDACION_AMPARO,
        isRecurringTravel,
        isUnexpectedTravel,
        isOutOfMapreDeadline: isLateForMapre,
        mapreDeadline,
      },
    })

    const riRole = await prisma.role.findUnique({ where: { name: 'RI_DIRECTORA' } })
    if (riRole) {
      await prisma.task.create({
        data: {
          caseId: caseRecord.id,
          step: WorkflowStep.AUTHORIZATION_VALIDATION,
          assignedRoleId: riRole.id,
          status: TaskStatus.PENDING,
        },
      })
    }

    await prisma.auditLog.createMany({
      data: [
        {
          actorUserId: user.userId,
          caseId: caseRecord.id,
          profileId,
          action:
            authorizationType === TravelAuthorizationType.MEMORANDO_PRESIDENCIA
              ? 'AUTHORIZATION_UPLOADED'
              : 'DIRECT_INSTRUCTION_CREATED',
          details: { authorizationType, evidenceChannel, hasDocument: !!authorizationDocument },
        },
        {
          actorUserId: user.userId,
          caseId: caseRecord.id,
          profileId,
          action: 'CHECKLIST_DOCUMENTAL_CREADO',
          details: { source: sourceFor(authorizationType) },
        },
      ],
    })

    if (isUnexpectedTravel) {
      await prisma.auditLog.create({
        data: {
          actorUserId: user.userId,
          caseId: caseRecord.id,
          profileId,
          action: 'URGENT_TRAVEL_CREATED',
          details: { justification, authorizedBy },
        },
      })
    }

    if (isLateForMapre) {
      await prisma.auditLog.create({
        data: {
          actorUserId: user.userId,
          caseId: caseRecord.id,
          profileId,
          action: 'OUT_OF_MAPRE_DEADLINE',
          details: { fechaSalida, mapreDeadline, justification },
        },
      })
    }

    await prisma.notification.createMany({
      data: [
        {
          caseId: caseRecord.id,
          type:
            authorizationType === TravelAuthorizationType.MEMORANDO_PRESIDENCIA
              ? NotificationType.AUTHORIZATION_RECEIVED
              : NotificationType.DIRECT_INSTRUCTION_REGISTERED,
          title:
            authorizationType === TravelAuthorizationType.MEMORANDO_PRESIDENCIA
              ? 'Autorizacion recibida'
              : 'Instruccion directa registrada',
          message: `Se registro autorizacion para ${evento || destinoPais || profile.fullName || profile.primaryEmail}.`,
        },
        {
          caseId: caseRecord.id,
          type: NotificationType.PENDING_AMPARO_VALIDATION,
          title: 'Pendiente validacion Amparo',
          message: 'El expediente requiere validacion de Amparo / RI antes de enviar designacion.',
        },
      ],
    })

    if (isUnexpectedTravel) {
      await prisma.notification.create({
        data: {
          caseId: caseRecord.id,
          type: NotificationType.URGENT_TRAVEL_CREATED,
          title: 'Viaje imprevisto registrado',
          message: 'Se registro un viaje imprevisto con justificacion obligatoria.',
        },
      })
    }

    if (isLateForMapre) {
      await prisma.notification.create({
        data: {
          caseId: caseRecord.id,
          type: NotificationType.OUT_OF_MAPRE_DEADLINE,
          title: 'Viaje fuera de plazo MAPRE',
          message: 'El viaje esta a menos de 15 dias del plazo requerido para MAPRE.',
        },
      })
    }

    return NextResponse.json({ case: caseRecord })
  } catch (error) {
    console.error('Authorization case creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
