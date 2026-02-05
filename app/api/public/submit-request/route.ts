import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { CaseSource, CaseStatus, DocumentType, WorkflowStep, TaskStatus } from '@prisma/client'
import { upsertProfileByCedulaOrEmail } from '@/lib/public/upsert-profile'
import { uploadAttachmentToBlob } from '@/lib/blob/upload'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    // Parse FormData
    const formData = await request.formData()
    
    // Extract form fields
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string | null
    const departamento = formData.get('departamento') as string | null
    const cargo = formData.get('cargo') as string | null
    const cedula = formData.get('cedula') as string | null
    const destinationCountry = formData.get('destinationCountry') as string
    const destinationCity = formData.get('destinationCity') as string
    const departureDate = formData.get('departureDate') as string
    const returnDate = formData.get('returnDate') as string
    const organizerInstitution = formData.get('organizerInstitution') as string | null
    const eventName = formData.get('eventName') as string | null
    const travelReason = formData.get('travelReason') as string
    const amount = formData.get('amount') as string | null
    const currency = formData.get('currency') as string | null
    const costCenter = formData.get('costCenter') as string | null
    const notes = formData.get('notes') as string | null
    const clientGeneratedId = formData.get('clientGeneratedId') as string
    
    // Extract documents
    const documentCount = parseInt(formData.get('documentCount') as string || '0')
    const documents: Array<{ file: File; docType: DocumentType }> = []
    
    for (let i = 0; i < documentCount; i++) {
      const file = formData.get(`document_${i}`) as File
      const docType = formData.get(`document_${i}_docType`) as string
      if (file) {
        documents.push({
          file,
          docType: docType as DocumentType,
        })
      }
    }

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'Nombre, apellido y email son requeridos' },
        { status: 400 }
      )
    }

    if (!destinationCountry || !destinationCity) {
      return NextResponse.json(
        { error: 'País y ciudad de destino son requeridos' },
        { status: 400 }
      )
    }

    if (!departureDate || !returnDate) {
      return NextResponse.json(
        { error: 'Fechas de salida y retorno son requeridas' },
        { status: 400 }
      )
    }

    // Validate dates
    const departureDateObj = new Date(departureDate)
    const returnDateObj = new Date(returnDate)
    if (isNaN(departureDateObj.getTime()) || isNaN(returnDateObj.getTime())) {
      return NextResponse.json(
        { error: 'Fechas inválidas' },
        { status: 400 }
      )
    }
    if (returnDateObj < departureDateObj) {
      return NextResponse.json(
        { error: 'La fecha de retorno debe ser posterior a la fecha de salida' },
        { status: 400 }
      )
    }

    // Check idempotency
    if (clientGeneratedId) {
      const existingCase = await prisma.case.findUnique({
        where: { clientGeneratedId },
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
      email,
      cedula: cedula || undefined,
      firstName,
      lastName,
      phone: phone || undefined,
      departamento: departamento || undefined,
      cargo: cargo || undefined,
    })

    // Create case
    const caseRecord = await prisma.case.create({
      data: {
        profileId: profileResult.profileId,
        source: CaseSource.PUBLIC_FORM,
        status: CaseStatus.RECEIVED,
        destinoPais: destinationCountry,
        destinoCiudad: destinationCity,
        fechaSalida: departureDateObj,
        fechaRetorno: returnDateObj,
        motivo: travelReason,
        evento: eventName || undefined,
        institucionOrganizadora: organizerInstitution || undefined,
        montoEstimado: amount ? parseFloat(amount) : undefined,
        moneda: currency || 'USD',
        centroCosto: costCenter || undefined,
        observaciones: notes || undefined,
        clientGeneratedId: clientGeneratedId || randomUUID(),
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
    for (const doc of documents) {
      try {
        // Convert File to Buffer
        const arrayBuffer = await doc.file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Determine if it's a base document (cedula/pasaporte/foto) or case document
        const isBaseDoc = 
          doc.docType === DocumentType.CEDULA || 
          doc.docType === DocumentType.PASAPORTE ||
          doc.docType === DocumentType.FOTO

        // Always pass profileId for blob path structure, but only associate base docs with profile
        const uploadResult = await uploadAttachmentToBlob({
          profileId: profileResult.profileId,
          caseId: isBaseDoc ? undefined : caseRecord.id,
          originalFilename: doc.file.name,
          buffer,
          contentType: doc.file.type,
          docType: doc.docType,
        })

        const document = await prisma.document.create({
          data: {
            profileId: isBaseDoc ? profileResult.profileId : undefined,
            caseId: isBaseDoc ? undefined : caseRecord.id,
            docType: doc.docType,
            originalFilename: doc.file.name,
            mimeType: doc.file.type,
            sizeBytes: buffer.length,
            blobUrl: uploadResult.blobUrl,
            blobPathname: uploadResult.blobPathname,
            checksumSha256: uploadResult.checksumSha256,
          },
        })

        uploadedDocuments.push(document.id)
      } catch (error) {
        console.error(`Error uploading document ${doc.file.name}:`, error)
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
    
    // Better error messages
    let errorMessage = 'Error al procesar la solicitud'
    let statusCode = 500
    
    if (error.message?.includes('centroCosto') || error.message?.includes('does not exist')) {
      errorMessage = 'Error de base de datos: La migración no se ha ejecutado. Contacte al administrador.'
      statusCode = 500
    } else if (error.message?.includes('unique constraint') || error.message?.includes('duplicate')) {
      errorMessage = 'Ya existe un registro con estos datos. Por favor, verifique la información.'
      statusCode = 409
    } else if (error.message?.includes('BLOB_READ_WRITE_TOKEN')) {
      errorMessage = 'Error de configuración del servidor. Contacte al administrador.'
      statusCode = 500
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}
