import { DocumentType } from '@prisma/client'

export function classifyDocumentType(filename: string, mimeType: string): DocumentType {
  const lowerFilename = filename.toLowerCase()
  const lowerMimeType = mimeType.toLowerCase()

  // Cédula
  if (
    lowerFilename.includes('cedula') ||
    lowerFilename.includes('cédula') ||
    lowerFilename.includes('id') ||
    lowerFilename.includes('identificacion') ||
    lowerFilename.includes('identificación') ||
    lowerFilename.includes('dni')
  ) {
    return DocumentType.CEDULA
  }

  // Pasaporte
  if (
    lowerFilename.includes('pasaporte') ||
    lowerFilename.includes('passport') ||
    lowerFilename.includes('pass')
  ) {
    return DocumentType.PASAPORTE
  }

  // Foto
  if (
    lowerFilename.includes('foto') ||
    lowerFilename.includes('photo') ||
    lowerFilename.includes('imagen') ||
    lowerFilename.includes('picture') ||
    lowerFilename.includes('img') ||
    lowerMimeType.startsWith('image/')
  ) {
    // Check if it's specifically a passport photo or ID photo
    if (
      lowerFilename.includes('pasaporte') ||
      lowerFilename.includes('passport') ||
      lowerFilename.includes('cedula') ||
      lowerFilename.includes('id')
    ) {
      // Could be either, but prioritize based on context
      // For now, if it has passport/cedula in name, don't classify as FOTO
      if (lowerFilename.includes('pasaporte') || lowerFilename.includes('passport')) {
        return DocumentType.PASAPORTE
      }
      if (lowerFilename.includes('cedula') || lowerFilename.includes('id')) {
        return DocumentType.CEDULA
      }
    }
    return DocumentType.FOTO
  }

  // Carta de invitación
  if (
    lowerFilename.includes('invitacion') ||
    lowerFilename.includes('invitación') ||
    lowerFilename.includes('invitation') ||
    lowerFilename.includes('carta') ||
    lowerFilename.includes('letter')
  ) {
    return DocumentType.CARTA_INVITACION
  }

  // Agenda
  if (
    lowerFilename.includes('agenda') ||
    lowerFilename.includes('schedule') ||
    lowerFilename.includes('programa')
  ) {
    return DocumentType.AGENDA
  }

  // Ticket
  if (
    lowerFilename.includes('ticket') ||
    lowerFilename.includes('boleto') ||
    lowerFilename.includes('vuelo') ||
    lowerFilename.includes('flight') ||
    lowerFilename.includes('reserva') ||
    lowerFilename.includes('reservation')
  ) {
    return DocumentType.TICKET
  }

  // Default to OTRO
  return DocumentType.OTRO
}

export function isBaseDocument(docType: DocumentType): boolean {
  return (
    docType === DocumentType.CEDULA ||
    docType === DocumentType.PASAPORTE ||
    docType === DocumentType.FOTO
  )
}

export function isCaseDocument(docType: DocumentType): boolean {
  return (
    docType === DocumentType.CARTA_INVITACION ||
    docType === DocumentType.AGENDA ||
    docType === DocumentType.TICKET ||
    docType === DocumentType.OTRO
  )
}
