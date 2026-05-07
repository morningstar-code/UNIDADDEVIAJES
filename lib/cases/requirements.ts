import { DocumentRequirementStatus, DocumentType, PrismaClient } from '@prisma/client'

const DEFAULT_REQUIREMENTS: Array<{ docType: DocumentType; label: string; required: boolean }> = [
  { docType: DocumentType.CORREO_DESIGNACION, label: 'Correo de designacion', required: true },
  { docType: DocumentType.ACEPTACION_COLABORADOR, label: 'Aceptacion del colaborador', required: true },
  { docType: DocumentType.CEDULA, label: 'Cedula', required: true },
  { docType: DocumentType.PASAPORTE, label: 'Pasaporte', required: true },
  { docType: DocumentType.VISA, label: 'Visa (si aplica)', required: false },
  { docType: DocumentType.CARTA_INVITACION, label: 'Invitacion de la actividad', required: true },
  { docType: DocumentType.AGENDA, label: 'Agenda', required: false },
  { docType: DocumentType.FORMULARIO_SOLICITUD_VIAJE, label: 'Formulario de solicitud de viaje', required: true },
  { docType: DocumentType.CARTA_MINISTRO_ADMINISTRATIVO, label: 'Carta al Ministro Administrativo', required: true },
  { docType: DocumentType.EXPEDIENTE_FIRMADO, label: 'Expediente firmado final', required: true },
  { docType: DocumentType.FORMULARIO_LIQUIDACION_GENERADO, label: 'Formulario de liquidacion de fondos/viaticos', required: false },
  { docType: DocumentType.FORMULARIO_LIQUIDACION_COMPLETADO, label: 'Formulario de liquidacion completado', required: false },
  { docType: DocumentType.FACTURAS_LIQUIDACION, label: 'Facturas de liquidacion', required: false },
  { docType: DocumentType.VOLANTE_DEPOSITO_REMANENTE, label: 'Volante de deposito de remanente', required: false },
  { docType: DocumentType.INFORME_EVENTO, label: 'Informe del evento', required: false },
  { docType: DocumentType.OTROS_ANEXOS_LIQUIDACION, label: 'Otros anexos de liquidacion', required: false },
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
