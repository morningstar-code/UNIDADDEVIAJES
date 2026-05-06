import { DocumentRequirementStatus, DocumentType, PrismaClient } from '@prisma/client'

const DEFAULT_REQUIREMENTS: Array<{ docType: DocumentType; label: string; required: boolean }> = [
  { docType: DocumentType.CEDULA, label: 'Cedula', required: true },
  { docType: DocumentType.PASAPORTE, label: 'Pasaporte', required: true },
  { docType: DocumentType.VISA, label: 'Visa (si aplica)', required: false },
  { docType: DocumentType.CARTA_INVITACION, label: 'Invitacion de la actividad', required: true },
  { docType: DocumentType.AGENDA, label: 'Agenda', required: false },
  { docType: DocumentType.FORMULARIO_SOLICITUD_VIAJE, label: 'Formulario de solicitud de viaje', required: true },
  { docType: DocumentType.CARTA_MINISTRO_ADMINISTRATIVO, label: 'Carta al Ministro Administrativo', required: true },
]

export async function ensureDefaultRequirements(prisma: PrismaClient, caseId: string) {
  for (const requirement of DEFAULT_REQUIREMENTS) {
    await prisma.documentRequirement.upsert({
      where: {
        caseId_docType: {
          caseId,
          docType: requirement.docType,
        },
      },
      update: {},
      create: {
        caseId,
        docType: requirement.docType,
        label: requirement.label,
        required: requirement.required,
        status: DocumentRequirementStatus.PENDING,
      },
    })
  }
}

export { DEFAULT_REQUIREMENTS }
