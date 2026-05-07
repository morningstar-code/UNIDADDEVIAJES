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

export function buildDesignationDocumentContent(caseRecord: CaseWithProfile) {
  return [
    'CORREO DE DESIGNACION',
    '',
    `Nombre colaborador: ${caseRecord.profile.fullName || caseRecord.profile.primaryEmail || ''}`,
    `Cargo colaborador: ${caseRecord.profile.cargo || ''}`,
    `Area colaborador: ${caseRecord.profile.departamento || ''}`,
    `Nombre evento: ${caseRecord.evento || ''}`,
    'Modalidad evento: Presencial / Por definir',
    `Ciudad destino: ${caseRecord.destinoCiudad || ''}`,
    `Pais destino: ${caseRecord.destinoPais || ''}`,
    `Fecha inicio evento: ${caseRecord.fechaSalida ? caseRecord.fechaSalida.toLocaleDateString('es-DO') : ''}`,
    `Fecha fin evento: ${caseRecord.fechaRetorno ? caseRecord.fechaRetorno.toLocaleDateString('es-DO') : ''}`,
    `Fecha salida: ${caseRecord.fechaSalida ? caseRecord.fechaSalida.toLocaleDateString('es-DO') : ''}`,
    `Fecha regreso: ${caseRecord.fechaRetorno ? caseRecord.fechaRetorno.toLocaleDateString('es-DO') : ''}`,
    `Institucion organizadora: ${caseRecord.institucionOrganizadora || ''}`,
    'Tipo beca: Por definir',
    `Cobertura evento: ${caseRecord.montoEstimado ? `${caseRecord.montoEstimado} ${caseRecord.moneda || 'USD'}` : 'Por definir'}`,
    `Tipo viatico: ${caseRecord.moneda || 'USD'}`,
    'Porcentaje DSA: Por definir',
    'Documentos requeridos: cedula, pasaporte, visa si aplica, invitacion, agenda si aplica y soportes solicitados.',
    'Necesita visa: Verificar segun pais destino.',
    'Informacion visa: Validar requisitos consulares antes de salida.',
    'Necesita vacuna: Verificar requisitos sanitarios.',
    'Informacion vacuna: Validar requisitos del pais destino.',
    `Correo Unidad de Viajes: ${process.env.UNIDAD_VIAJES_RESPONSABLE_EMAIL || process.env.MS_SHARED_MAILBOX || 'unidaddeviajes@indotel.gob.do'}`,
    `Observaciones: ${caseRecord.observaciones || ''}`,
    `Nombre responsable Unidad de Viajes: ${process.env.UNIDAD_VIAJES_RESPONSABLE_NOMBRE || 'Dolores / Unidad de Viajes'}`,
    `Cargo responsable: ${process.env.UNIDAD_VIAJES_RESPONSABLE_CARGO || 'Unidad de Viajes'}`,
    `Telefono responsable: ${process.env.UNIDAD_VIAJES_RESPONSABLE_TELEFONO || ''}`,
    `Email responsable: ${process.env.UNIDAD_VIAJES_RESPONSABLE_EMAIL || process.env.MS_SHARED_MAILBOX || ''}`,
    '',
    'Nota post-viaje: si recibio viaticos o fondos, debera completar la liquidacion de fondos/viaticos, anexar facturas y remitir volante de deposito de remanentes cuando corresponda.',
  ].join('\n')
}

export function buildLiquidationContent(caseRecord: CaseWithProfile) {
  const total = caseRecord.montoEstimado?.toString() || '0.00'
  const currency = caseRecord.moneda || 'USD'
  return [
    'FORMULARIO DE LIQUIDACION DE FONDOS / VIATICOS',
    '',
    'Datos generales',
    'Institucion: Instituto Dominicano de las Telecomunicaciones',
    `Departamento: ${caseRecord.profile.departamento || ''}`,
    `Nombre del viajero: ${caseRecord.profile.fullName || ''}`,
    `Cedula: ${caseRecord.profile.cedula || ''}`,
    `Destino del viaje: ${caseRecord.destinoCiudad ? `${caseRecord.destinoCiudad}, ` : ''}${caseRecord.destinoPais || ''}`,
    `Fecha de salida: ${caseRecord.fechaSalida ? caseRecord.fechaSalida.toLocaleDateString('es-DO') : ''}`,
    `Fecha de regreso: ${caseRecord.fechaRetorno ? caseRecord.fechaRetorno.toLocaleDateString('es-DO') : ''}`,
    `Nombre del evento: ${caseRecord.evento || ''}`,
    `Fecha del reporte: ${new Date().toLocaleDateString('es-DO')}`,
    '',
    'Campos de liquidacion',
    `Avance entregado al servidor: ${total}`,
    '20% considerado gastos menores, si aplica: 0.00',
    `Total viaticos: ${total}`,
    'Gastos realizados: 0.00',
    'Restante a devolver: 0.00',
    'Devolucion a cuenta del INDOTEL: 0.00',
    `Moneda: ${currency}`,
    'Tasa de cambio: 0.00',
    'Total RD$: 0.00',
    '',
    'Tabla de gastos',
    'Fecha de consumo | No. factura | Descripcion/comercio | Hotel | Comida | Transporte | Comunicacion | Varios | Moneda | Subtotal | Tasa cambio | Total RD$',
    '',
    'Firmas',
    'Firma servidor publico: ________________________________',
    'Enlace institucional y/o responsable: ___________________',
    'Unidad de Viajes: ______________________________________',
    '',
    'Nota: Este formulario debe enviarse con anexos de justificacion de gastos y volante de deposito de remanentes cuando corresponda. No deben incluirse facturas de bebidas alcoholicas.',
  ].join('\n')
}
