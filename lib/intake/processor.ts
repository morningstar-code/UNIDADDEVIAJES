import { prisma } from '@/lib/db/prisma'
import {
  CaseSource,
  CaseStatus,
  DocumentType,
  ProcessedMessageStatus,
  WorkflowStep,
  TaskStatus,
} from '@prisma/client'
import { getMessage, getAttachments, downloadAttachment } from '@/lib/graph/messages'
import { uploadAttachmentToBlob } from '@/lib/blob/upload'
import { parseEmailContent, normalizeEmail, parseDate } from './parser'
import { classifyDocumentType, isBaseDocument, isCaseDocument } from './classifier'

export interface ProcessEmailResult {
  success: boolean
  profileId?: string
  caseId?: string
  error?: string
}

export async function processEmailMessage(
  graphMessageId: string,
  internetMessageId: string
): Promise<ProcessEmailResult> {
  // Check idempotency
  const existing = await prisma.processedMessage.findUnique({
    where: { internetMessageId },
  })

  if (existing) {
    console.log(`Message ${internetMessageId} already processed`)
    return {
      success: existing.status === ProcessedMessageStatus.OK,
      profileId: undefined,
      caseId: undefined,
      error: existing.error || undefined,
    }
  }

  // Create processed message record
  const processedMessage = await prisma.processedMessage.create({
    data: {
      internetMessageId,
      graphMessageId,
      status: ProcessedMessageStatus.OK,
    },
  })

  try {
    // Fetch message from Graph
    const message = await getMessage(graphMessageId)
    const fromEmail = message.from.emailAddress.address
    const subject = message.subject || ''
    const body = message.body.content || ''

    // Parse email content
    const parsed = parseEmailContent(subject, body, fromEmail)
    const normalizedEmail = normalizeEmail(parsed.email || fromEmail)

    // Upsert Profile
    const profile = await prisma.profile.upsert({
      where: { primaryEmail: normalizedEmail },
      update: {
        fullName: parsed.fullName || undefined,
        cedula: parsed.cedula || undefined,
        passportNumber: parsed.passportNumber || undefined,
        passportCountry: parsed.passportCountry || undefined,
        phone: parsed.phone || undefined,
      },
      create: {
        primaryEmail: normalizedEmail,
        fullName: parsed.fullName,
        cedula: parsed.cedula,
        passportNumber: parsed.passportNumber,
        passportCountry: parsed.passportCountry,
        phone: parsed.phone,
      },
    })

    // Create or update Case
    let caseRecord
    if (parsed.caseId) {
      // Update existing case
      caseRecord = await prisma.case.update({
        where: { id: parsed.caseId },
        data: {
          destinoPais: parsed.destinoPais || undefined,
          destinoCiudad: parsed.destinoCiudad || undefined,
          fechaSalida: parsed.fechaSalida ? parseDate(parsed.fechaSalida) : undefined,
          fechaRetorno: parsed.fechaRetorno ? parseDate(parsed.fechaRetorno) : undefined,
          motivo: parsed.motivo || undefined,
          evento: parsed.evento || undefined,
          institucionOrganizadora: parsed.institucionOrganizadora || undefined,
          montoEstimado: parsed.montoEstimado ? parsed.montoEstimado : undefined,
          moneda: parsed.moneda || 'USD',
          contenidoRaw: body,
        },
      })
    } else {
      // Create new case
      const hasRequiredFields =
        parsed.destinoPais || parsed.fechaSalida || parsed.motivo || parsed.evento

      caseRecord = await prisma.case.create({
        data: {
          profileId: profile.id,
          source: CaseSource.EMAIL_AUTOMATION,
          status: hasRequiredFields ? CaseStatus.RECEIVED : CaseStatus.NEEDS_INFO,
          destinoPais: parsed.destinoPais,
          destinoCiudad: parsed.destinoCiudad,
          fechaSalida: parsed.fechaSalida ? parseDate(parsed.fechaSalida) : undefined,
          fechaRetorno: parsed.fechaRetorno ? parseDate(parsed.fechaRetorno) : undefined,
          motivo: parsed.motivo,
          evento: parsed.evento,
          institucionOrganizadora: parsed.institucionOrganizadora,
          montoEstimado: parsed.montoEstimado ? parsed.montoEstimado : undefined,
          moneda: parsed.moneda || 'USD',
          contenidoRaw: body,
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

      // Audit log
      await prisma.auditLog.create({
        data: {
          caseId: caseRecord.id,
          profileId: profile.id,
          action: 'CASE_CREATED',
          details: {
            source: 'EMAIL_AUTOMATION',
            messageId: internetMessageId,
          },
        },
      })
    }

    // Process attachments
    if (message.hasAttachments) {
      const attachments = await getAttachments(graphMessageId)

      for (const attachment of attachments) {
        try {
          const buffer = await downloadAttachment(graphMessageId, attachment.id)
          const docType = classifyDocumentType(attachment.name, attachment.contentType)

          const uploadResult = await uploadAttachmentToBlob({
            profileId: profile.id,
            caseId: isCaseDocument(docType) ? caseRecord.id : undefined,
            originalFilename: attachment.name,
            buffer,
            contentType: attachment.contentType,
            docType: docType.toLowerCase(), // For pathname only
          })

          await prisma.document.create({
            data: {
              profileId: isBaseDocument(docType) ? profile.id : undefined,
              caseId: isCaseDocument(docType) ? caseRecord.id : undefined,
              docType,
              originalFilename: attachment.name,
              mimeType: attachment.contentType,
              sizeBytes: attachment.size,
              blobUrl: uploadResult.blobUrl,
              blobPathname: uploadResult.blobPathname,
              checksumSha256: uploadResult.checksumSha256,
              sourceEmailMessageId: internetMessageId,
            },
          })

          await prisma.auditLog.create({
            data: {
              caseId: caseRecord.id,
              profileId: profile.id,
              action: 'DOC_UPLOADED',
              details: {
                filename: attachment.name,
                docType,
                source: 'EMAIL_AUTOMATION',
              },
            },
          })
        } catch (error) {
          console.error(`Error processing attachment ${attachment.name}:`, error)
          // Continue with other attachments
        }
      }
    }

    // Update processed message
    await prisma.processedMessage.update({
      where: { id: processedMessage.id },
      data: {
        status: ProcessedMessageStatus.OK,
      },
    })

    return {
      success: true,
      profileId: profile.id,
      caseId: caseRecord.id,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Error processing message ${internetMessageId}:`, error)

    await prisma.processedMessage.update({
      where: { id: processedMessage.id },
      data: {
        status: ProcessedMessageStatus.FAILED,
        error: errorMessage,
      },
    })

    return {
      success: false,
      error: errorMessage,
    }
  }
}
