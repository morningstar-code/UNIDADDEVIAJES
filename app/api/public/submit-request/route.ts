import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { CaseSource, CaseStatus, DocumentType, WorkflowStep, TaskStatus } from '@prisma/client'
import { upsertProfileByCedulaOrEmail } from '@/lib/public/upsert-profile'
import { uploadAttachmentToBlob } from '@/lib/blob/upload'
import { randomUUID } from 'crypto'

interface DocumentUpload {
  filename: string
  contentType: string
  data: string // base64
  docType: DocumentType
}

interface SubmitRequestData {
  // Personal data
  firstName: string
  lastName: string
  email: string
  phone?: string
  departamento?: string
  cargo?: string
  cedula?: string

  // Travel data
  destinationCountry: string
  destinationCity: string
  departureDate: string
  returnDate: string
  organizerInstitution?: string
  eventName?: string
  travelReason: string

  // Administrative data
  amount?: number
  currency?: string
  costCenter?: string
  notes?: string

  // Documents
  documents: DocumentUpload[]

  // Idempotency
  clientGeneratedId: string
}

export async function POST(request: NextRequest) {
  try {
    const data: SubmitRequestData = await request.json()

    // Validate required fields
    if (!data.firstName || !data.lastName || !data.email) {
      return NextResponse.json(
        { error: 'Nombre, apellido y email son requeridos' },
        { status: 400 }
      )
    }

    if (!data.destinationCountry || !data.destinationCity) {
      return NextResponse.json(
        { error: 'País y ciudad de destino son requeridos' },
        { status: 400 }
      )
    }

    if (!data.departureDate || !data.returnDate) {
      return NextResponse.json(
        { error: 'Fechas de salida y retorno son requeridas' },
        { status: 400 }
      )
    }

    // Validate dates
    const departureDate = new Date(data.departureDate)
    const returnDate = new Date(data.returnDate)
    if (isNaN(departureDate.getTime()) || isNaN(returnDate.getTime())) {
      return NextResponse.json(
        { error: 'Fechas inválidas' },
        { status: 400 }
      )
    }
    if (returnDate < departureDate) {
      return NextResponse.json(
        { error: 'La fecha de retorno debe ser posterior a la fecha de salida' },
        { status: 400 }
      )
    }

    // Check idempotency
    if (data.clientGeneratedId) {
      const existingCase = await prisma.case.findUnique({
        where: { clientGeneratedId: data.clientGeneratedId },
      })
      if (existingCase) {
        return NextResponse.json({
          success: true,
          caseId: existingCase.id,
          caseNumber: `TRV-${existingCase.id.substring(0, 8).toUpperCase()}`,
          message: 'Solicitud ya procesada',
        })
      }
    }

    // Upsert profile
    const profileResult = await upsertProfileByCedulaOrEmail({
      email: data.email,
      cedula: data.cedula,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      departamento: data.departamento,
      cargo: data.cargo,
    })

    // Create case
    const caseRecord = await prisma.case.create({
      data: {
        profileId: profileResult.profileId,
        source: CaseSource.PUBLIC_FORM,
        status: CaseStatus.RECEIVED,
        destinoPais: data.destinationCountry,
        destinoCiudad: data.destinationCity,
        fechaSalida: departureDate,
        fechaRetorno: returnDate,
        motivo: data.travelReason,
        evento: data.eventName,
        institucionOrganizadora: data.organizerInstitution,
        montoEstimado: data.amount ? parseFloat(data.amount.toString()) : undefined,
        moneda: data.currency || 'USD',
        centroCosto: data.costCenter,
        observaciones: data.notes,
          clientGeneratedId: data.clientGeneratedId || randomUUID(),
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

    // Upload documents
    const uploadedDocuments = []
    for (const doc of data.documents || []) {
      try {
        // Decode base64
        const buffer = Buffer.from(doc.data, 'base64')

        // Determine if it's a base document (cedula/pasaporte) or case document
        const isBaseDoc = doc.docType === DocumentType.CEDULA || doc.docType === DocumentType.PASAPORTE

        const uploadResult = await uploadAttachmentToBlob({
          profileId: isBaseDoc ? profileResult.profileId : undefined,
          caseId: caseRecord.id,
          originalFilename: doc.filename,
          buffer,
          contentType: doc.contentType,
          docType: doc.docType,
        })

        const document = await prisma.document.create({
          data: {
            profileId: isBaseDoc ? profileResult.profileId : undefined,
            caseId: caseRecord.id,
            docType: doc.docType,
            originalFilename: doc.filename,
            mimeType: doc.contentType,
            sizeBytes: buffer.length,
            blobUrl: uploadResult.blobUrl,
            blobPathname: uploadResult.blobPathname,
            checksumSha256: uploadResult.checksumSha256,
          },
        })

        uploadedDocuments.push(document.id)
      } catch (error) {
        console.error(`Error uploading document ${doc.filename}:`, error)
        // Continue with other documents
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        caseId: caseRecord.id,
        profileId: profileResult.profileId,
        action: 'CASE_CREATED',
        details: {
          source: 'PUBLIC_FORM',
          isNewProfile: profileResult.isNew,
          documentsCount: uploadedDocuments.length,
          conflict: profileResult.conflict,
        },
      },
    })

    return NextResponse.json({
      success: true,
      caseId: caseRecord.id,
      caseNumber: `TRV-${caseRecord.id.substring(0, 8).toUpperCase()}`,
      profileId: profileResult.profileId,
      isNewProfile: profileResult.isNew,
      documentsUploaded: uploadedDocuments.length,
      conflict: profileResult.conflict,
    })
  } catch (error: any) {
    console.error('Error submitting public request:', error)
    return NextResponse.json(
      { error: error.message || 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}
