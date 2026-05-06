import { Case, Profile } from '@prisma/client'

type CaseWithProfile = Case & { profile: Profile }

export function buildDesignationSubject(caseRecord: CaseWithProfile) {
  return `Designacion de viaje: ${caseRecord.evento || caseRecord.destinoPais || 'Solicitud de viaje'}`
}

export function buildDesignationBody(caseRecord: CaseWithProfile, acceptanceUrl: string) {
  const collaborator = caseRecord.profile.fullName || caseRecord.profile.primaryEmail || 'colaborador'
  return `
    <p>Estimado/a ${collaborator},</p>
    <p>Por este medio se le notifica su designacion para participar en el siguiente viaje institucional:</p>
    <ul>
      <li><strong>Evento/actividad:</strong> ${caseRecord.evento || 'Por definir'}</li>
      <li><strong>Destino:</strong> ${caseRecord.destinoCiudad ? `${caseRecord.destinoCiudad}, ` : ''}${caseRecord.destinoPais || 'Por definir'}</li>
      <li><strong>Fecha de salida:</strong> ${caseRecord.fechaSalida ? caseRecord.fechaSalida.toLocaleDateString('es-DO') : 'Por definir'}</li>
      <li><strong>Fecha de regreso:</strong> ${caseRecord.fechaRetorno ? caseRecord.fechaRetorno.toLocaleDateString('es-DO') : 'Por definir'}</li>
      <li><strong>Objetivo:</strong> ${caseRecord.motivo || 'Por definir'}</li>
    </ul>
    <p>Para continuar el proceso, favor confirmar su disponibilidad, aceptar los terminos del viaje y cargar los documentos requeridos.</p>
    <p><a href="${acceptanceUrl}">Abrir designacion</a></p>
    <p>Unidad de Viajes - INDOTEL</p>
  `
}

export function buildPlainPreview(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}
