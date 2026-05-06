import { Case, Profile } from '@prisma/client'

type CaseWithProfile = Case & { profile: Profile }

export function buildTravelRequestContent(caseRecord: CaseWithProfile) {
  return [
    'FORMULARIO DE SOLICITUD DE VIAJE AL EXTERIOR',
    '',
    `Nombre: ${caseRecord.profile.fullName || ''}`,
    `Cedula: ${caseRecord.profile.cedula || ''}`,
    `Cargo: ${caseRecord.profile.cargo || ''}`,
    `Area: ${caseRecord.profile.departamento || ''}`,
    `Pais: ${caseRecord.destinoPais || ''}`,
    `Ciudad: ${caseRecord.destinoCiudad || ''}`,
    `Fecha de salida: ${caseRecord.fechaSalida ? caseRecord.fechaSalida.toLocaleDateString('es-DO') : ''}`,
    `Fecha de regreso: ${caseRecord.fechaRetorno ? caseRecord.fechaRetorno.toLocaleDateString('es-DO') : ''}`,
    `Evento: ${caseRecord.evento || ''}`,
    `Institucion organizadora: ${caseRecord.institucionOrganizadora || ''}`,
    `Objetivo del viaje: ${caseRecord.motivo || ''}`,
    `Monto estimado: ${caseRecord.montoEstimado || ''} ${caseRecord.moneda || 'USD'}`,
    `Centro de costo: ${caseRecord.centroCosto || ''}`,
    `Observaciones: ${caseRecord.observaciones || ''}`,
  ].join('\n')
}

export function buildMinisterLetterContent(caseRecord: CaseWithProfile) {
  const collaborator = caseRecord.profile.fullName || 'colaborador designado'
  const destination = `${caseRecord.destinoCiudad ? `${caseRecord.destinoCiudad}, ` : ''}${caseRecord.destinoPais || ''}`
  return [
    'CARTA AL MINISTRO ADMINISTRATIVO DE LA PRESIDENCIA',
    '',
    'Honorable Ministro Administrativo de la Presidencia,',
    '',
    `Cortesmente, solicitamos la autorizacion correspondiente para que ${collaborator}, ${caseRecord.profile.cargo || 'colaborador de INDOTEL'}, participe en ${caseRecord.evento || 'la actividad indicada'}, a celebrarse en ${destination}.`,
    '',
    `El viaje esta previsto desde ${caseRecord.fechaSalida ? caseRecord.fechaSalida.toLocaleDateString('es-DO') : 'fecha por definir'} hasta ${caseRecord.fechaRetorno ? caseRecord.fechaRetorno.toLocaleDateString('es-DO') : 'fecha por definir'}.`,
    '',
    `El objetivo institucional del viaje es: ${caseRecord.motivo || 'fortalecer la participacion institucional conforme a la agenda del evento'}.`,
    '',
    'Se anexan los documentos de soporte correspondientes, incluyendo formulario de solicitud, documentos personales, invitacion, agenda y demas anexos aplicables.',
    '',
    'Atentamente,',
    '',
    'Guido Gomez Mazara',
    'Presidente del Consejo Directivo',
    'INDOTEL',
  ].join('\n')
}
